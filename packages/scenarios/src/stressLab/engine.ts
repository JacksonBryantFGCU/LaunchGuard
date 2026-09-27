import type {
  ArchitectureModification,
  ArchitectureSimulationResult,
  StressParameterValues,
} from "@redline/shared";
import { resolveActiveComponents } from "@redline/shared";
import { nonlinearUtilizationMultiplier } from "./latencyCurve.js";
import { estimateConcurrency } from "./concurrency.js";
import { amplifyDemandWithRetries, type RetryBackoff } from "./retryAmplification.js";
import { applyTimeout } from "./timeoutEffect.js";
import { applyThrottle } from "./throttle.js";

// Deterministic architecture-stress engine (Phase 7). Private: capacity
// numbers and formulas here are scenario truth and must never reach the
// frontend directly - only the projected ArchitectureSimulationResult does.
//
// Assumptions/approximations (documented per spec #11, not a real queueing
// simulator):
// - A service's request capacity scales linearly with instance count
//   (capacityPerInstanceRpm); instances beyond the authored baseline are
//   added only as far as demand requires, capped by any learner-configured
//   autoscaling-policy maxInstances.
// - Each instance holds a fixed number of DB connections; connections split
//   into a read fraction (eligible for cache/read-replica offload) and a
//   write fraction (never offloadable) via `readFraction`.
// - A connection pooler caps a node's *outbound* connections to the
//   database; demand beyond the cap queues instead of failing, and queueing
//   adds latency proportional to how oversubscribed the pooler is.
// - DB latency multiplier is a step function of connection utilization
//   (normal <70%, degraded <90%, saturated >=90%), not a real queueing-
//   theory curve - close enough to teach the shape of the effect.
// - checkout-service is the one user-facing latency path modeled; other
//   services only contribute connection demand.

export interface ComponentSimulationProfile {
  nodeId: string;
  baselineInstances: number;
  capacityPerInstanceRpm: number;
  connectionsPerInstance: number;
  /** Fraction of this node's DB connections that are reads (eligible for cache/read-replica offload). Default 0 (all writes). */
  readFraction?: number;
  /** Learner-visible autoscaling ceiling in the baseline architecture. Default unbounded. */
  maxInstances?: number;
}

export interface DatabaseSimulationProfile {
  nodeId: string;
  maxConnections: number;
  /** Base round-trip latency folded into checkout p95 before the utilization multiplier. Default 150. */
  baseLatencyMs?: number;
}

export interface RequirementTarget {
  requirementId: string;
  area: "throughput" | "latency" | "availability" | "recovery";
  targetMs?: number;
  targetPercent?: number;
  targetSeconds?: number;
}

export interface StressLabSimulationInput {
  parameters: StressParameterValues;
  componentProfiles: ComponentSimulationProfile[];
  database: DatabaseSimulationProfile;
  modifications: ArchitectureModification[];
  requirementTargets: RequirementTarget[];
  /** Fraction (0-1) of external-dependency calls that fail this frame. Default 0 - only the dependency_degradation test category sets this. */
  externalErrorRate?: number;
  /** False models a regional database outage this frame - only the regional_failure test category sets this. Default true. */
  databaseAvailable?: boolean;
  /**
   * Timeline-computed circuit-breaker state for the external dependency this
   * frame (spec #18) - the timeline layer decides open/closed/half-open from
   * elapsed time (circuitBreaker.ts), engine.ts only reacts to it: "open"
   * fails the call fast instead of waiting out the full dependency latency.
   */
  externalCircuitBreakerOpen?: boolean;
  /** Bounds how long checkout waits on the external dependency (spec #17). Undefined = no timeout configured. */
  externalTimeoutMs?: number;
  /** Retry policy on the external dependency call (spec #19/#20) - amplifies effective demand on the calling service. */
  externalRetryPolicy?: { retryCount: number; backoff: RetryBackoff };
  /** Caps admitted traffic before it reaches the architecture (spec #24). Undefined = unthrottled. */
  requestRateLimit?: number;
  /**
   * Overrides a node's instance count instead of the default instantaneous
   * demand-driven calculation (spec #14) - the timeline layer supplies this
   * for the traffic-spike category, which models autoscaling with a
   * cooldown/scaleStep delay (autoscaling.ts) rather than instant scaling.
   * Every other test category omits this and keeps the original
   * instantaneous-scaling behavior unchanged.
   */
  instanceOverrides?: Record<string, number>;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

interface NodeSimResult {
  nodeId: string;
  instances: number;
  neededInstances: number;
  shortfall: number;
  rawDemand: number;
  cappedDemand: number;
  queueOverflow: number;
  poolerMax: number | undefined;
  utilizationPercent: number;
}

/** The demand-driven instance count that would fully satisfy this traffic level, ignoring any configured ceiling - exported so the timeline layer's cooldown-based autoscaling model (spec #14) can compute a scaling target without duplicating this formula. */
export function computeNeededInstances(profile: ComponentSimulationProfile, traffic: number): number {
  return Math.max(profile.baselineInstances, Math.ceil(traffic / profile.capacityPerInstanceRpm));
}

function simulateNode(
  profile: ComponentSimulationProfile,
  traffic: number,
  active: ReturnType<typeof resolveActiveComponents>,
  instanceOverride: number | undefined,
): NodeSimResult {
  const autoscaleMod = active.find((m) => m.componentType === "autoscaling-policy" && m.targetNodeId === profile.nodeId);
  const maxInstances = autoscaleMod?.config.maxInstances ?? profile.maxInstances ?? Infinity;
  const neededInstances = computeNeededInstances(profile, traffic);
  // instanceOverride (spec #14): the timeline layer's cooldown-based
  // autoscaling model supplies the actual carried instance count for the
  // traffic-spike category; every other test omits it and keeps the
  // original instantaneous min(neededInstances, maxInstances) behavior.
  const instances = instanceOverride != null ? Math.min(instanceOverride, maxInstances) : Math.min(neededInstances, maxInstances);
  const shortfall = Math.max(0, neededInstances - instances);

  const dbEdgeId = `${profile.nodeId}-postgres`;
  const cacheMod = active.find((m) => m.componentType === "cache" && m.targetEdgeId === dbEdgeId);
  const hasReadReplica = active.some((m) => m.componentType === "read-replica" && m.targetNodeId === "postgres");
  const readFraction = profile.readFraction ?? 0;
  const writeFraction = 1 - readFraction;
  const hitRate = cacheMod ? clamp01(cacheMod.config.hitRate ?? 0.5) : 0;
  const effectiveReadFraction = hasReadReplica ? 0 : readFraction * (1 - hitRate);
  const connectionsPerInstanceEffective = profile.connectionsPerInstance * (writeFraction + effectiveReadFraction);
  const rawDemand = instances * connectionsPerInstanceEffective;

  const poolerMod = active.find((m) => m.componentType === "connection-pooler" && m.targetEdgeId === dbEdgeId);
  const poolerMax = poolerMod?.config.maxBackendConnections;
  const cappedDemand = poolerMax != null ? Math.min(rawDemand, poolerMax) : rawDemand;
  const queueOverflow = poolerMax != null ? Math.max(0, rawDemand - poolerMax) : 0;

  const utilizationPercent = Math.round((traffic / (instances * profile.capacityPerInstanceRpm)) * 100);

  return { nodeId: profile.nodeId, instances, neededInstances, shortfall, rawDemand, cappedDemand, queueOverflow, poolerMax, utilizationPercent };
}

export function simulateArchitecture(input: StressLabSimulationInput): ArchitectureSimulationResult {
  if (input.databaseAvailable === false) {
    return simulateDatabaseUnavailable(input);
  }

  const active = resolveActiveComponents(input.modifications);
  const baseLatencyMs = input.database.baseLatencyMs ?? 150;

  // Throttling (spec #24): caps admitted traffic before it reaches the
  // architecture. Unthrottled demand still exists (rejectedByThrottle feeds
  // the availability formula), it just never reaches checkout/inventory.
  const rawTraffic = input.parameters.trafficRequestsPerMinute ?? 0;
  const { admitted: traffic, rejected: throttledDemand } = applyThrottle(rawTraffic, input.requestRateLimit);

  // External dependency: circuit breaker (spec #18) fails fast instead of
  // waiting out the full dependency latency once open; otherwise a
  // configured timeout (spec #17) bounds the wait and converts the
  // overshoot into additional errors. Both are optional and mutually
  // exclusive per frame - an open breaker never also waits for a timeout.
  const rawExternalLatencyMs = input.parameters.externalDependencyLatencyMs ?? 0;
  const rawExternalErrorRate = input.externalErrorRate ?? 0;
  let externalLatencyMs = rawExternalLatencyMs;
  let externalErrorRate = rawExternalErrorRate;
  if (input.externalCircuitBreakerOpen) {
    externalLatencyMs = 0;
    externalErrorRate = 1;
  } else if (input.externalTimeoutMs != null) {
    const timeoutResult = applyTimeout(rawExternalLatencyMs, input.externalTimeoutMs);
    externalLatencyMs = timeoutResult.boundedLatencyMs;
    externalErrorRate = clamp01(rawExternalErrorRate + timeoutResult.additionalErrorRate);
  }
  const paymentLatencyMs = externalLatencyMs * (1 + externalErrorRate);

  // Retries amplify effective demand on the calling service (spec #19/#20) -
  // only checkout-service calls the payment provider synchronously, so only
  // its effective traffic is amplified; inventory-service is unaffected.
  const retryPolicy = input.externalRetryPolicy;
  const checkoutTraffic = retryPolicy ? amplifyDemandWithRetries(traffic, externalErrorRate, retryPolicy.retryCount, retryPolicy.backoff) : traffic;

  const nodeResults = input.componentProfiles.map((profile) =>
    simulateNode(profile, profile.nodeId === "checkout-service" ? checkoutTraffic : traffic, active, input.instanceOverrides?.[profile.nodeId]),
  );

  const demandBeforeDbCap = nodeResults.reduce((sum, n) => sum + n.cappedDemand, 0);
  const usedConnections = Math.min(demandBeforeDbCap, input.database.maxConnections);
  const utilization = demandBeforeDbCap / input.database.maxConnections;
  const connectionsRejected = demandBeforeDbCap > input.database.maxConnections;

  const totalQueueOverflow = nodeResults.reduce((sum, n) => sum + n.queueOverflow, 0);
  const totalPoolerMax = nodeResults.reduce((sum, n) => sum + (n.poolerMax ?? 0), 0);
  const queueLatencyMs = totalQueueOverflow > 0 ? (totalQueueOverflow / Math.max(totalPoolerMax, 1)) * 300 : 0;

  const checkout = nodeResults.find((n) => n.nodeId === "checkout-service");
  const appQueueLatencyMs = (checkout?.shortfall ?? 0) * 50;
  const anyShortfall = nodeResults.some((n) => n.shortfall > 0);

  const multiplier = nonlinearUtilizationMultiplier(utilization);
  const checkoutP95Ms = round((baseLatencyMs + paymentLatencyMs) * multiplier + queueLatencyMs + appQueueLatencyMs);

  // Availability (spec #29): successful / total requests this frame.
  // Failure sources: DB connections rejected outright, external-dependency
  // errors (including timeout/breaker-driven ones), and throttled demand -
  // combined additively and capped at 100%, an educational approximation
  // documented here rather than a true joint-probability model.
  const dbFailureRate = connectionsRejected ? clamp01((demandBeforeDbCap - input.database.maxConnections) / demandBeforeDbCap) : 0;
  const throttleFailureRate = rawTraffic > 0 ? clamp01(throttledDemand / rawTraffic) : 0;
  const combinedErrorRate = clamp01(dbFailureRate + externalErrorRate * 0.5 + throttleFailureRate);
  const availabilityPercent = round((1 - combinedErrorRate) * 100);

  // Little's Law (spec #9): checkout's own concurrency rises with how long
  // each request takes, which is what makes a slow synchronous dependency
  // pressure checkout's own capacity even at unchanged traffic.
  const checkoutConcurrency = round(estimateConcurrency(checkoutTraffic / 60, checkoutP95Ms / 1000));

  const dbState = utilization <= 0.7 ? "normal" : utilization <= 0.9 ? "degraded" : "saturated";
  const nodeStates: ArchitectureSimulationResult["nodeStates"] = [
    {
      nodeId: input.database.nodeId,
      state: dbState,
      metrics: {
        Connections: `${Math.round(usedConnections)}/${input.database.maxConnections}`,
        Utilization: `${Math.round(utilization * 100)}%`,
      },
      numericMetrics: {
        connectionsUsed: round(usedConnections),
        maxConnections: input.database.maxConnections,
        utilizationPercent: round(utilization * 100),
        latencyMs: round(baseLatencyMs * multiplier),
      },
      explanation:
        dbState === "saturated"
          ? "Combined connection demand from horizontally-scaled services meets or exceeds the connection ceiling."
          : dbState === "degraded"
            ? "Connection demand is elevated but has not yet reached the connection ceiling."
            : "Connection demand is well within the configured ceiling.",
    },
    ...nodeResults.map((n) => ({
      nodeId: n.nodeId,
      state: (n.shortfall > 0 ? "saturated" : n.queueOverflow > 0 || dbState === "saturated" ? "degraded" : "normal") as
        | "normal"
        | "degraded"
        | "saturated",
      metrics: {
        Instances: `${n.instances}${n.shortfall > 0 ? ` (needs ${n.neededInstances})` : ""}`,
        "DB connections": `${Math.round(n.cappedDemand)}`,
      },
      numericMetrics: {
        instanceCount: n.instances,
        utilizationPercent: n.utilizationPercent,
        ...(n.nodeId === "checkout-service" ? { concurrency: checkoutConcurrency, latencyMs: checkoutP95Ms, throughput: round(checkoutTraffic) } : { throughput: round(traffic) }),
      },
      explanation:
        n.shortfall > 0
          ? "Configured autoscaling ceiling is below the instance count this traffic level needs."
          : n.queueOverflow > 0
            ? "Connection pooler is queueing demand beyond its configured backend connection cap."
            : dbState === "saturated"
              ? "Waiting on database connections held by the saturated database."
              : "Comfortably covering current demand.",
    })),
  ];

  const edgeStates: ArchitectureSimulationResult["edgeStates"] = nodeResults.map((n) => ({
    edgeId: `${n.nodeId}-postgres`,
    state: (n.queueOverflow > 0 ? "backlogged" : dbState === "saturated" ? "degraded" : "normal") as
      | "normal"
      | "degraded"
      | "backlogged",
    metrics: { "Connections used": `${Math.round(n.cappedDemand)}` },
    numericMetrics: { requestRate: round(n.cappedDemand) },
    explanation:
      n.queueOverflow > 0
        ? "Connection pooler is queueing requests beyond its backend connection cap."
        : dbState === "saturated"
          ? "New connection attempts on this edge compete for a saturated connection pool."
          : "Connections flow normally.",
  }));

  const requirementResults: ArchitectureSimulationResult["requirementResults"] = input.requirementTargets.map((req) => {
    if (req.area === "recovery") {
      // Recovery time is a whole-run aggregate a single frame can't observe
      // on its own - runStressTimeline recomputes this requirement once the
      // full timeline is known.
      return { requirementId: req.requirementId, status: "met", explanation: "Evaluated across the full run." };
    }
    if (req.area === "availability") {
      const target = req.targetPercent ?? 100;
      const status = availabilityPercent < target ? "violated" : availabilityPercent < target + 0.05 ? "at_risk" : "met";
      return {
        requirementId: req.requirementId,
        status,
        observedValue: `${availabilityPercent}% this frame`,
        explanation:
          status === "violated"
            ? "Combined database, dependency, and throttling failures push this frame's success rate below the availability target."
            : "This frame's request success rate stays within the availability target.",
      };
    }
    if (req.area === "throughput") {
      const status = connectionsRejected || anyShortfall ? "violated" : utilization >= 0.9 ? "at_risk" : "met";
      return {
        requirementId: req.requirementId,
        status,
        observedValue: connectionsRejected ? `${Math.round(demandBeforeDbCap)} connections demanded / ${input.database.maxConnections} available` : undefined,
        explanation: connectionsRejected
          ? "Connection demand exceeds the database's connection ceiling; excess connections fail."
          : anyShortfall
            ? "A configured autoscaling ceiling leaves demand above available instance capacity."
            : "Demand stays within provisioned capacity.",
      };
    }
    const targetMs = req.targetMs ?? Infinity;
    const status = checkoutP95Ms > targetMs ? "violated" : checkoutP95Ms > targetMs * 0.75 ? "at_risk" : "met";
    return {
      requirementId: req.requirementId,
      status,
      observedValue: `p95 ${checkoutP95Ms}ms`,
      explanation:
        status === "violated"
          ? "Checkout p95 latency exceeds its target once database saturation and/or queueing are accounted for."
          : "Checkout p95 latency stays within target.",
    };
  });

  const bottlenecks: ArchitectureSimulationResult["bottlenecks"] = [];
  if (utilization >= 0.9) {
    bottlenecks.push({
      targetType: "node",
      targetId: input.database.nodeId,
      metric: "Connections",
      observed: `${Math.round(usedConnections)}/${input.database.maxConnections}`,
      threshold: `${input.database.maxConnections}`,
      severity: utilization >= 1.0 ? "critical" : "high",
      explanation: "Horizontally-scaled services collectively approach or exceed the database's fixed connection ceiling.",
      // Observed causal chain (spec #35) - a graph-path narrative of what
      // was observed, not a generic inference engine or a suggested fix.
      causalChain: ["Checkout/Inventory instance count", "Database connection demand", "Database connection ceiling"],
    });
  }
  const latencyTarget = input.requirementTargets.find((r) => r.area === "latency")?.targetMs;
  if (latencyTarget != null && checkoutP95Ms > latencyTarget) {
    bottlenecks.push({
      targetType: "node",
      targetId: "checkout-service",
      metric: "p95 latency",
      observed: `${checkoutP95Ms}ms`,
      threshold: `${latencyTarget}ms`,
      severity: checkoutP95Ms > latencyTarget * 2 ? "critical" : "high",
      explanation:
        queueLatencyMs > 0 && utilization < 0.9
          ? "Latency is now dominated by connection-pooler queueing rather than database saturation."
          : "Requests queue behind saturated database connections before completing.",
      causalChain:
        paymentLatencyMs > baseLatencyMs
          ? ["Payment Provider latency", "Checkout in-flight requests (Little's Law)", "Checkout p95 latency"]
          : ["Database connection saturation", "Checkout p95 latency"],
    });
  }
  for (const n of nodeResults) {
    if (n.shortfall > 0) {
      bottlenecks.push({
        targetType: "node",
        targetId: n.nodeId,
        metric: "Instances",
        observed: `${n.instances}`,
        threshold: `${n.neededInstances}`,
        severity: "high",
        explanation: "Configured autoscaling ceiling is below the instance count current traffic needs.",
        causalChain: ["Traffic level", "Needed instance count", "Configured autoscaling ceiling"],
      });
    }
  }

  return {
    nodeStates,
    edgeStates,
    requirementResults,
    bottlenecks,
    systemMetrics: {
      totalConnections: round(usedConnections),
      dbUtilizationPercent: round(utilization * 100),
      checkoutP95Ms,
      availabilityPercent,
      checkoutConcurrency,
      throttledDemand: round(throttledDemand),
    },
  };
}

// The regional_failure test category's failure window: the database and
// every edge into it go unavailable outright, rather than degrading along
// the normal capacity curve. requirementTargets are still walked so a
// caller always gets one result per requirement id.
function simulateDatabaseUnavailable(input: StressLabSimulationInput): ArchitectureSimulationResult {
  const nodeStates: ArchitectureSimulationResult["nodeStates"] = [
    { nodeId: input.database.nodeId, state: "unavailable", metrics: {}, numericMetrics: { utilizationPercent: 0 }, explanation: "The region hosting this database is unavailable." },
    ...input.componentProfiles.map((p) => ({
      nodeId: p.nodeId,
      state: "degraded" as const,
      metrics: {},
      numericMetrics: {},
      explanation: "Writes and reads through the unavailable database fail.",
    })),
  ];
  const edgeStates: ArchitectureSimulationResult["edgeStates"] = input.componentProfiles.map((p) => ({
    edgeId: `${p.nodeId}-postgres`,
    state: "unavailable" as const,
    metrics: {},
    numericMetrics: {},
    explanation: "The database on the other end of this edge is unavailable.",
  }));
  const requirementResults: ArchitectureSimulationResult["requirementResults"] = input.requirementTargets.map((req) => ({
    requirementId: req.requirementId,
    status: req.area === "availability" || req.area === "recovery" ? ("met" as const) : ("violated" as const),
    explanation:
      req.area === "availability" || req.area === "recovery"
        ? "Evaluated across the full run."
        : "The database is unavailable, so this requirement cannot be met.",
  }));
  return {
    nodeStates,
    edgeStates,
    requirementResults,
    bottlenecks: [
      {
        targetType: "node",
        targetId: input.database.nodeId,
        metric: "Availability",
        observed: "unavailable",
        threshold: "available",
        severity: "critical",
        explanation: "The region hosting this database is unavailable.",
        causalChain: ["Regional failure", "Database unavailable", "Checkout/Inventory writes fail"],
      },
    ],
    systemMetrics: { totalConnections: 0, dbUtilizationPercent: 0, checkoutP95Ms: 0, availabilityPercent: 0 },
  };
}
