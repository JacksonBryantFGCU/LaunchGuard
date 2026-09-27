import { test } from "node:test";
import assert from "node:assert/strict";
import { runStressTimeline, type StressTimelineTestInput } from "./timeline.js";

const componentProfiles = [
  { nodeId: "checkout-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35 },
  { nodeId: "inventory-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35, readFraction: 0.5 },
];
const database = { nodeId: "postgres", maxConnections: 500 };
const requirementTargets = [
  { requirementId: "req-throughput", area: "throughput" as const },
  { requirementId: "req-latency", area: "latency" as const, targetMs: 800 },
];

test("load: a constant-traffic run produces one identical frame per step and an aggregate matching a single simulation", () => {
  const input: StressTimelineTestInput = {
    category: "load",
    durationSeconds: 60,
    stepSeconds: 30,
    parameters: { requestsPerMinute: 15000 },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets,
  };
  const result = runStressTimeline(input);
  assert.equal(result.frames.length, 3); // t=0,30,60
  assert.deepEqual(result.frames[0]!.systemMetrics, result.frames[2]!.systemMetrics);
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "met");
  assert.equal(result.passed, true);
});

test("spike: traffic ramps from baseline to spike level, and the peak frame is worse than the baseline frame", () => {
  const input: StressTimelineTestInput = {
    category: "spike",
    durationSeconds: 120,
    stepSeconds: 30,
    parameters: {
      baselineRequestsPerMinute: 800,
      spikeRequestsPerMinute: 32000,
      rampSeconds: 30,
      spikeDuration: 60,
    },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets,
  };
  const result = runStressTimeline(input);
  const firstFrame = result.frames[0]!;
  const peakFrame = result.frames.find((f) => f.timestampSeconds === 60)!;
  assert.equal(firstFrame.systemMetrics.trafficRequestsPerMinute, 800);
  assert.equal(peakFrame.systemMetrics.trafficRequestsPerMinute, 32000);
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "violated");
});

test("dependency_degradation: sustained provider latency drives checkout p95 up for the whole run", () => {
  const input: StressTimelineTestInput = {
    category: "dependency_degradation",
    durationSeconds: 60,
    stepSeconds: 30,
    parameters: { providerLatencyMs: 4000, providerErrorRate: 0, duration: 60, referenceTrafficRequestsPerMinute: 800 },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets,
  };
  const result = runStressTimeline(input);
  assert.ok(result.finalMetrics.checkoutP95Ms! > 800);
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "violated");
});

test("resource_saturation: a lowered database connection ceiling saturates the database even at modest traffic", () => {
  const input: StressTimelineTestInput = {
    category: "resource_saturation",
    durationSeconds: 30,
    stepSeconds: 30,
    parameters: { requestsPerMinute: 15000, databaseMaxConnections: 100, databaseBaseLatencyMs: 150 },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets,
  };
  const result = runStressTimeline(input);
  assert.equal(result.frames[0]!.nodeStates.find((n) => n.nodeId === "postgres")?.state, "saturated");
});

test("regional_failure: the database goes unavailable for the failure window and recovers after", () => {
  const input: StressTimelineTestInput = {
    category: "regional_failure",
    durationSeconds: 120,
    stepSeconds: 30,
    parameters: { requestsPerMinute: 800, failureStartTime: 30, failureDuration: 60 },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets: [
      ...requirementTargets,
      { requirementId: "req-availability", area: "availability" as const, targetPercent: 99.95 },
      { requirementId: "req-rto", area: "recovery" as const, targetSeconds: 300 },
    ],
  };
  const result = runStressTimeline(input);
  const duringFailure = result.frames.find((f) => f.timestampSeconds === 60)!;
  const beforeFailure = result.frames.find((f) => f.timestampSeconds === 0)!;
  assert.equal(duringFailure.nodeStates.find((n) => n.nodeId === "postgres")?.state, "unavailable");
  assert.equal(beforeFailure.nodeStates.find((n) => n.nodeId === "postgres")?.state, "normal");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-availability")?.status, "violated");
});

test("regional_failure: a database-failover modification with a short recovery window satisfies the RTO requirement", () => {
  const input: StressTimelineTestInput = {
    category: "regional_failure",
    durationSeconds: 120,
    stepSeconds: 30,
    parameters: { requestsPerMinute: 800, failureStartTime: 30, failureDuration: 60 },
    componentProfiles,
    database,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "database-failover", targetNodeId: "postgres", config: { recoverySeconds: 20 } },
    ],
    requirementTargets: [
      ...requirementTargets,
      { requirementId: "req-rto", area: "recovery" as const, targetSeconds: 300 },
    ],
  };
  const result = runStressTimeline(input);
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-rto")?.status, "met");
});

test("determinism: the same timeline input always produces an identical result", () => {
  const input: StressTimelineTestInput = {
    category: "spike",
    durationSeconds: 90,
    stepSeconds: 30,
    parameters: { baselineRequestsPerMinute: 800, spikeRequestsPerMinute: 20000, rampSeconds: 30, spikeDuration: 30 },
    componentProfiles,
    database,
    modifications: [],
    requirementTargets,
  };
  assert.deepEqual(runStressTimeline(input), runStressTimeline(input));
});
