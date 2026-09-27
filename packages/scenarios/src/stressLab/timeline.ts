import type {
  ArchitectureModification,
  ArchitectureSimulationResult,
  SimulationBottleneck,
  SimulationEvent,
  SimulationFrame,
  SimulationRequirementResult,
  StressParameterValues,
  StressTestCategory,
  StressTestTimelineResult,
} from "@redline/shared";
import { resolveActiveComponents } from "@redline/shared";
import {
  simulateArchitecture,
  computeNeededInstances,
  type ComponentSimulationProfile,
  type DatabaseSimulationProfile,
  type RequirementTarget,
} from "./engine.js";
import { circuitBreakerStateAt, type CircuitBreakerConfig } from "./circuitBreaker.js";
import { stepAutoscale, type AutoscaleState } from "./autoscaling.js";
import type { RetryBackoff } from "./retryAmplification.js";

// Walks a StressProfile's category-specific time function across its
// simulated-time window, calling the existing (pure, one-frame) engine once
// per step. This is the seam that turns the Phase 7 one-shot engine into
// the timeline the wider stress-test spec requires, without forking a
// second capacity/latency model - every frame still goes through
// simulateArchitecture.
export interface StressTimelineTestInput {
  testId?: string;
  category: StressTestCategory;
  durationSeconds: number;
  stepSeconds: number;
  parameters: StressParameterValues;
  componentProfiles: ComponentSimulationProfile[];
  database: DatabaseSimulationProfile;
  modifications: ArchitectureModification[];
  requirementTargets: RequirementTarget[];
}

interface FrameInputs {
  trafficRequestsPerMinute: number;
  externalDependencyLatencyMs: number;
  externalErrorRate: number;
  databaseMaxConnections: number;
  databaseBaseLatencyMs: number;
  databaseAvailable: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Linear ramp between two levels over `rampSeconds`, clamped to the endpoints. */
function ramp(t: number, from: number, to: number, rampSeconds: number): number {
  if (rampSeconds <= 0) return t <= 0 ? from : to;
  return from + (to - from) * clamp01(t / rampSeconds);
}

// Each test category's authored parameters drive time-varying demand
// directly (spec #16/#17 in miniature) - deliberately not a generic
// scheduled-event system, since none of these five tests need arbitrary
// event timing beyond what their own typed parameters already express.
function frameInputsAt(t: number, category: StressTestCategory, p: StressParameterValues, database: DatabaseSimulationProfile): FrameInputs {
  const base: FrameInputs = {
    trafficRequestsPerMinute: p.requestsPerMinute ?? 0,
    externalDependencyLatencyMs: p.externalDependencyLatencyMs ?? 0,
    externalErrorRate: 0,
    databaseMaxConnections: database.maxConnections,
    databaseBaseLatencyMs: database.baseLatencyMs ?? 150,
    databaseAvailable: true,
  };

  switch (category) {
    case "spike": {
      const baseline = p.baselineRequestsPerMinute ?? 0;
      const spike = p.spikeRequestsPerMinute ?? 0;
      const rampSeconds = p.rampSeconds ?? 0;
      const spikeDuration = p.spikeDuration ?? 0;
      const rampEnd = rampSeconds;
      const holdEnd = rampEnd + spikeDuration;
      const fallEnd = holdEnd + rampSeconds;
      let traffic: number;
      if (t < rampEnd) traffic = ramp(t, baseline, spike, rampSeconds);
      else if (t < holdEnd) traffic = spike;
      else if (t < fallEnd) traffic = ramp(t - holdEnd, spike, baseline, rampSeconds);
      else traffic = baseline;
      return { ...base, trafficRequestsPerMinute: traffic };
    }
    case "dependency_degradation": {
      return {
        ...base,
        trafficRequestsPerMinute: p.referenceTrafficRequestsPerMinute ?? 0,
        externalDependencyLatencyMs: p.providerLatencyMs ?? 0,
        externalErrorRate: clamp01(p.providerErrorRate ?? 0),
      };
    }
    case "resource_saturation": {
      return {
        ...base,
        databaseMaxConnections: p.databaseMaxConnections ?? database.maxConnections,
        databaseBaseLatencyMs: p.databaseBaseLatencyMs ?? database.baseLatencyMs ?? 150,
      };
    }
    case "regional_failure": {
      const failureStart = p.failureStartTime ?? 0;
      const failureEnd = failureStart + (p.failureDuration ?? 0);
      return { ...base, databaseAvailable: !(t >= failureStart && t < failureEnd) };
    }
    case "load":
    default:
      return base;
  }
}

function worseStatus(a: SimulationRequirementResult["status"], b: SimulationRequirementResult["status"]): SimulationRequirementResult["status"] {
  const rank = { met: 0, at_risk: 1, violated: 2 } as const;
  return rank[b] > rank[a] ? b : a;
}

function mergeBottlenecks(all: SimulationBottleneck[][]): SimulationBottleneck[] {
  const severityRank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  const byKey = new Map<string, SimulationBottleneck>();
  for (const frameBottlenecks of all) {
    for (const b of frameBottlenecks) {
      const key = `${b.targetType}:${b.targetId}:${b.metric}`;
      const existing = byKey.get(key);
      if (!existing || severityRank[b.severity] > severityRank[existing.severity]) byKey.set(key, b);
    }
  }
  return [...byKey.values()];
}

/** A failover intervention shrinks the effective outage to its configured recovery time (spec #21/#28). */
function effectiveRecoverySeconds(failureDuration: number, modifications: ArchitectureModification[], databaseNodeId: string): number {
  const active = resolveActiveComponents(modifications);
  const failover = active.find((m) => m.componentType === "database-failover" && m.targetNodeId === databaseNodeId);
  const recoverySeconds = failover?.config.recoverySeconds;
  return recoverySeconds != null ? Math.min(recoverySeconds, failureDuration) : failureDuration;
}

const PAYMENT_EDGE_ID = "checkout-service-payment-provider";
const BACKOFF_BY_CODE: Record<number, RetryBackoff> = { 0: "none", 1: "fixed", 2: "exponential" };

/** Reads the dependency-facing interventions (timeout/circuit-breaker/retry) and the generic throttle, all optional (spec #17/#18/#19/#24). */
function readDependencyInterventions(modifications: ArchitectureModification[]) {
  const active = resolveActiveComponents(modifications);
  const timeoutMod = active.find((m) => m.componentType === "timeout" && m.targetEdgeId === PAYMENT_EDGE_ID);
  const breakerMod = active.find((m) => m.componentType === "circuit-breaker" && m.targetEdgeId === PAYMENT_EDGE_ID);
  const retryMod = active.find((m) => m.componentType === "retry-policy" && m.targetEdgeId === PAYMENT_EDGE_ID);
  const throttleMod = active.find((m) => m.componentType === "rate-limiter" && m.targetNodeId === "checkout-service");

  const breakerConfig: CircuitBreakerConfig | undefined = breakerMod
    ? { failureThreshold: breakerMod.config.failureThreshold ?? 0.5, window: breakerMod.config.window ?? 10, recoverySeconds: breakerMod.config.recoverySeconds ?? 30 }
    : undefined;

  return {
    timeoutMs: timeoutMod?.config.timeoutMs,
    breakerConfig,
    retryPolicy: retryMod ? { retryCount: retryMod.config.retryCount ?? 3, backoff: BACKOFF_BY_CODE[retryMod.config.backoff ?? 0] ?? "none" } : undefined,
    requestRateLimit: throttleMod?.config.requestRateLimit,
  };
}

function computeFrame(
  t: number,
  input: StressTimelineTestInput,
  autoscaleState: Map<string, AutoscaleState>,
): ArchitectureSimulationResult {
  const f = frameInputsAt(t, input.category, input.parameters, input.database);
  const dependency = readDependencyInterventions(input.modifications);
  const breakerOpen = dependency.breakerConfig
    ? circuitBreakerStateAt(t, dependency.breakerConfig, f.externalErrorRate) !== "closed"
    : false;

  // Autoscaling-with-cooldown (spec #14) only models the traffic-spike
  // category, which exists specifically to teach reaction delay - every
  // other category keeps its original instantaneous scaling behavior.
  let instanceOverrides: Record<string, number> | undefined;
  if (input.category === "spike") {
    instanceOverrides = {};
    for (const profile of input.componentProfiles) {
      const needed = computeNeededInstances(profile, profile.nodeId === "checkout-service" ? f.trafficRequestsPerMinute : f.trafficRequestsPerMinute);
      const policy = { minInstances: profile.baselineInstances, maxInstances: profile.maxInstances ?? Infinity, scaleStep: 2, cooldownSeconds: 30 };
      const previous = autoscaleState.get(profile.nodeId) ?? { instances: profile.baselineInstances, secondsSinceLastScale: policy.cooldownSeconds };
      const next = stepAutoscale(previous, needed, policy, input.stepSeconds);
      autoscaleState.set(profile.nodeId, next);
      instanceOverrides[profile.nodeId] = next.instances;
    }
  }

  return simulateArchitecture({
    parameters: {
      trafficRequestsPerMinute: f.trafficRequestsPerMinute,
      externalDependencyLatencyMs: f.externalDependencyLatencyMs,
    },
    componentProfiles: input.componentProfiles,
    database: { ...input.database, maxConnections: f.databaseMaxConnections, baseLatencyMs: f.databaseBaseLatencyMs },
    modifications: input.modifications,
    requirementTargets: input.requirementTargets,
    externalErrorRate: f.externalErrorRate,
    databaseAvailable: f.databaseAvailable,
    externalCircuitBreakerOpen: breakerOpen,
    externalTimeoutMs: dependency.timeoutMs,
    externalRetryPolicy: dependency.retryPolicy,
    requestRateLimit: dependency.requestRateLimit,
    instanceOverrides,
  });
}

/** Meaningful state changes worth showing in an event timeline (spec #54) - only emitted on an actual transition, never every frame. */
function deriveEvents(t: number, previous: ArchitectureSimulationResult | undefined, current: ArchitectureSimulationResult, trafficRequestsPerMinute: number): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  if (!previous) return events;

  const prevTraffic = previous.systemMetrics.dbUtilizationPercent;
  if (prevTraffic !== undefined && Math.abs((current.systemMetrics.dbUtilizationPercent ?? 0) - prevTraffic) > 15) {
    events.push({ atSeconds: t, type: "traffic_change", message: `Traffic level shifts to ${Math.round(trafficRequestsPerMinute).toLocaleString()} req/min.` });
  }

  for (const node of current.nodeStates) {
    const prevNode = previous.nodeStates.find((n) => n.nodeId === node.nodeId);
    if (prevNode && prevNode.state !== node.state) {
      if (node.state === "saturated" || node.state === "unavailable") {
        events.push({ atSeconds: t, type: "saturation", message: `${node.nodeId} becomes ${node.state}.` });
      } else if (prevNode.state === "unavailable") {
        events.push({ atSeconds: t, type: "recovery", message: `${node.nodeId} recovers.` });
      } else if (node.state === "degraded") {
        events.push({ atSeconds: t, type: "failure", message: `${node.nodeId} becomes degraded.` });
      }
    }
    const prevInstances = prevNode?.numericMetrics.instanceCount;
    const nextInstances = node.numericMetrics.instanceCount;
    if (prevInstances != null && nextInstances != null && nextInstances !== prevInstances) {
      events.push({ atSeconds: t, type: "scaling", message: `${node.nodeId} scales to ${nextInstances} instance(s).` });
    }
  }

  for (const req of current.requirementResults) {
    const prevReq = previous.requirementResults.find((r) => r.requirementId === req.requirementId);
    if (prevReq && prevReq.status !== req.status) {
      events.push({ atSeconds: t, type: "requirement_change", message: `${req.requirementId} becomes ${req.status.toUpperCase()}.` });
    }
  }

  return events;
}

export function runStressTimeline(input: StressTimelineTestInput): StressTestTimelineResult {
  const steps: number[] = [];
  for (let t = 0; t <= input.durationSeconds; t += input.stepSeconds) steps.push(t);

  const autoscaleState = new Map<string, AutoscaleState>();
  const results: ArchitectureSimulationResult[] = [];
  const frames: SimulationFrame[] = steps.map((t, i) => {
    const result = computeFrame(t, input, autoscaleState);
    results.push(result);
    const f = frameInputsAt(t, input.category, input.parameters, input.database);
    const events = deriveEvents(t, results[i - 1], result, f.trafficRequestsPerMinute);
    return {
      timestampSeconds: t,
      nodeStates: result.nodeStates,
      edgeStates: result.edgeStates,
      requirementResults: result.requirementResults,
      systemMetrics: { ...result.systemMetrics, trafficRequestsPerMinute: f.trafficRequestsPerMinute },
      events,
    };
  });

  const requirementResults: SimulationRequirementResult[] = input.requirementTargets.map((req) => {
    if (req.area === "availability") {
      const observedPercent = round2(frames.reduce((sum, f) => sum + (f.systemMetrics.availabilityPercent ?? 100), 0) / frames.length);
      const target = req.targetPercent ?? 100;
      return {
        requirementId: req.requirementId,
        status: observedPercent < target ? "violated" : "met",
        observedValue: `${observedPercent}% availability across the run`,
        explanation:
          observedPercent < target
            ? "Combined database, dependency, and throttling failures push the run's average success rate below the availability target."
            : "The run's average request success rate stays within the availability target.",
      };
    }
    if (req.area === "recovery") {
      const failureDuration = input.parameters.failureDuration ?? 0;
      const observedSeconds = effectiveRecoverySeconds(failureDuration, input.modifications, input.database.nodeId);
      const target = req.targetSeconds ?? Infinity;
      return {
        requirementId: req.requirementId,
        status: observedSeconds > target ? "violated" : "met",
        observedValue: `recovered in ${observedSeconds}s`,
        explanation:
          observedSeconds > target
            ? "No architecture change bounds recovery time within the target during a regional failure."
            : "Recovery completes within the target recovery time.",
      };
    }
    return frames.reduce<SimulationRequirementResult>(
      (worst, frame) => {
        const frameResult = frame.requirementResults.find((r) => r.requirementId === req.requirementId);
        if (!frameResult) return worst;
        return worseStatus(worst.status, frameResult.status) === frameResult.status ? frameResult : worst;
      },
      { requirementId: req.requirementId, status: "met", explanation: "No frame evaluated this requirement." },
    );
  });

  const bottlenecks = mergeBottlenecks(results.map((r) => r.bottlenecks));

  const passed = requirementResults.every((r) => r.status !== "violated");
  const finalFrame = frames[frames.length - 1]!;

  return {
    testId: input.testId ?? input.category,
    parameters: input.parameters,
    frames,
    finalMetrics: finalFrame.systemMetrics,
    bottlenecks,
    requirementResults,
    passed,
    summary: passed
      ? "All requirements held throughout the run."
      : `${requirementResults.filter((r) => r.status === "violated").length} requirement(s) were violated during the run.`,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
