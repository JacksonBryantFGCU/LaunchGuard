import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateArchitecture, type StressLabSimulationInput } from "./engine.js";

// Two services (checkout, inventory) sharing one fixed-capacity database -
// the same shape as the Black Friday Capacity Surge architecture, kept
// abstract here so the engine tests don't depend on scenario-specific data.
const baseInput: StressLabSimulationInput = {
  parameters: { trafficRequestsPerMinute: 32000, externalDependencyLatencyMs: 220 },
  componentProfiles: [
    { nodeId: "checkout-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35 },
    { nodeId: "inventory-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35, readFraction: 0.5 },
  ],
  database: { nodeId: "postgres", maxConnections: 500 },
  modifications: [],
  requirementTargets: [
    { requirementId: "req-throughput", area: "throughput" },
    { requirementId: "req-latency", area: "latency", targetMs: 800 },
  ],
};

test("baseline: both services autoscale but the shared database saturates and both requirements fail", () => {
  const result = simulateArchitecture(baseInput);

  const postgres = result.nodeStates.find((n) => n.nodeId === "postgres");
  assert.equal(postgres?.state, "saturated");

  const throughput = result.requirementResults.find((r) => r.requirementId === "req-throughput");
  const latency = result.requirementResults.find((r) => r.requirementId === "req-latency");
  assert.equal(throughput?.status, "violated");
  assert.equal(latency?.status, "violated");

  assert.ok(result.bottlenecks.some((b) => b.targetId === "postgres"));
  assert.equal(result.systemMetrics.checkoutP95Ms, 2738);
});

test("connection pooler alone, tuned well, resolves both DB saturation and latency", () => {
  const result = simulateArchitecture({
    ...baseInput,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 170 } },
      { kind: "add-component", id: "m2", componentType: "connection-pooler", targetEdgeId: "inventory-service-postgres", config: { maxBackendConnections: 170 } },
    ],
  });
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "met");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "met");
});

test("connection pooler capped too aggressively regresses latency via queueing even though the DB is now healthy", () => {
  const result = simulateArchitecture({
    ...baseInput,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 50 } },
      { kind: "add-component", id: "m2", componentType: "connection-pooler", targetEdgeId: "inventory-service-postgres", config: { maxBackendConnections: 50 } },
    ],
  });
  const postgres = result.nodeStates.find((n) => n.nodeId === "postgres");
  assert.equal(postgres?.state, "normal");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "met");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "violated");
});

test("constraining autoscaling alone still fails: DB pressure barely eases while checkout capacity now falls short", () => {
  const result = simulateArchitecture({
    ...baseInput,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "autoscaling-policy", targetNodeId: "checkout-service", config: { maxInstances: 5 } },
    ],
  });
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "violated");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "violated");
});

test("eligible cache on inventory's read path combined with pooling passes with a smaller pooler cap", () => {
  const result = simulateArchitecture({
    ...baseInput,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 150 } },
      { kind: "add-component", id: "m2", componentType: "connection-pooler", targetEdgeId: "inventory-service-postgres", config: { maxBackendConnections: 150 } },
      { kind: "add-component", id: "m3", componentType: "cache", targetEdgeId: "inventory-service-postgres", config: { hitRate: 0.6 } },
    ],
  });
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "met");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "met");
  assert.ok(result.systemMetrics.checkoutP95Ms < 630, "cache should push latency lower than pooling alone");
});

test("cache has no eligible effect on checkout's write path (not a modeled read edge)", () => {
  const withoutCache = simulateArchitecture(baseInput);
  const withCache = simulateArchitecture({
    ...baseInput,
    modifications: [{ kind: "add-component", id: "m1", componentType: "cache", targetEdgeId: "checkout-service-postgres", config: { hitRate: 0.9 } }],
  });
  assert.deepEqual(withCache.systemMetrics, withoutCache.systemMetrics);
});

test("a load balancer does not create database capacity - unrelated modification, unrelated bottleneck", () => {
  const withoutLb = simulateArchitecture(baseInput);
  const withLb = simulateArchitecture({
    ...baseInput,
    modifications: [{ kind: "add-component", id: "m1", componentType: "load-balancer", targetEdgeId: "api-gateway-checkout-service", config: {} }],
  });
  assert.deepEqual(withLb, withoutLb);
});

test("determinism: same architecture and parameters always produce the same result", () => {
  const first = simulateArchitecture(baseInput);
  const second = simulateArchitecture(baseInput);
  assert.deepEqual(first, second);
});

test("reset design (remove-component undoes an add-component) reproduces the baseline result", () => {
  const withThenWithoutMod = simulateArchitecture({
    ...baseInput,
    modifications: [
      { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 150 } },
      { kind: "remove-component", modificationId: "m1" },
    ],
  });
  assert.deepEqual(withThenWithoutMod, simulateArchitecture(baseInput));
});

// --- new mechanics: timeout, circuit breaker, retry, throttle, concurrency, availability ---

const lightTrafficInput: StressLabSimulationInput = {
  ...baseInput,
  parameters: { trafficRequestsPerMinute: 4000, externalDependencyLatencyMs: 5000 },
};

test("timeout bounds how long checkout waits on a slow provider, and converts the overshoot into additional errors", () => {
  const withoutTimeout = simulateArchitecture(lightTrafficInput);
  const withTimeout = simulateArchitecture({ ...lightTrafficInput, externalTimeoutMs: 1000 });

  assert.ok(withTimeout.systemMetrics.checkoutP95Ms! < withoutTimeout.systemMetrics.checkoutP95Ms!);
  assert.ok(withTimeout.systemMetrics.availabilityPercent! < withoutTimeout.systemMetrics.availabilityPercent!);
});

test("an open circuit breaker fails fast (near-zero dependency latency) but drives availability down, not up", () => {
  const closed = simulateArchitecture(lightTrafficInput);
  const open = simulateArchitecture({ ...lightTrafficInput, externalCircuitBreakerOpen: true });

  assert.ok(open.systemMetrics.checkoutP95Ms! < closed.systemMetrics.checkoutP95Ms!);
  assert.ok(open.systemMetrics.availabilityPercent! < closed.systemMetrics.availabilityPercent!);
});

test("a circuit breaker does not heal the dependency: latency it fails fast on is never attributed as healthy", () => {
  const open = simulateArchitecture({ ...lightTrafficInput, externalCircuitBreakerOpen: true });
  assert.notEqual(open.systemMetrics.availabilityPercent, 100);
});

test("retries amplify effective checkout demand when the dependency is failing", () => {
  const withoutRetries = simulateArchitecture({ ...lightTrafficInput, externalErrorRate: 0.5 });
  const withRetries = simulateArchitecture({
    ...lightTrafficInput,
    externalErrorRate: 0.5,
    externalRetryPolicy: { retryCount: 3, backoff: "none" },
  });
  const checkoutWithout = withoutRetries.nodeStates.find((n) => n.nodeId === "checkout-service")!;
  const checkoutWith = withRetries.nodeStates.find((n) => n.nodeId === "checkout-service")!;
  assert.ok(checkoutWith.numericMetrics.throughput! > checkoutWithout.numericMetrics.throughput!);
});

test("throttling admits only up to the configured rate limit and reduces availability by the rejected fraction", () => {
  const unthrottled = simulateArchitecture(baseInput);
  const throttled = simulateArchitecture({ ...baseInput, requestRateLimit: 10000 });
  assert.ok(throttled.systemMetrics.availabilityPercent! < unthrottled.systemMetrics.availabilityPercent!);
});

test("checkout concurrency is exposed and rises when the payment provider is slower (Little's Law)", () => {
  const fast = simulateArchitecture({ ...lightTrafficInput, parameters: { ...lightTrafficInput.parameters, externalDependencyLatencyMs: 100 } });
  const slow = simulateArchitecture(lightTrafficInput);
  const fastConcurrency = fast.nodeStates.find((n) => n.nodeId === "checkout-service")!.numericMetrics.concurrency!;
  const slowConcurrency = slow.nodeStates.find((n) => n.nodeId === "checkout-service")!.numericMetrics.concurrency!;
  assert.ok(slowConcurrency > fastConcurrency);
});

test("a saturated database bottleneck carries a causal chain describing what was observed", () => {
  const result = simulateArchitecture(baseInput);
  const dbBottleneck = result.bottlenecks.find((b) => b.targetId === "postgres");
  assert.ok(dbBottleneck!.causalChain.length > 0);
});
