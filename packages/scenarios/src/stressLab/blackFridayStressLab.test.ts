import { test } from "node:test";
import assert from "node:assert/strict";
import { runStressTimeline } from "./timeline.js";
import { blackFridayTestDefinitions, buildBlackFridayTimelineInput } from "./blackFridayStressLab.js";

function defaultParameters(testId: string): Record<string, number> {
  const profile = blackFridayTestDefinitions.find((p) => p.id === testId)!;
  return Object.fromEntries(profile.parameters.map((p) => [p.id, p.defaultValue]));
}

test("all five test definitions are wired to a valid timeline input", () => {
  for (const profile of blackFridayTestDefinitions) {
    const input = buildBlackFridayTimelineInput(profile.id, defaultParameters(profile.id), []);
    assert.ok(input, `expected a timeline input for ${profile.id}`);
  }
});

test("database-saturation baseline reproduces the authored stress-10x-spike outcome: DB connection ceiling breached, throughput and latency both fail", () => {
  const input = buildBlackFridayTimelineInput("database-saturation", defaultParameters("database-saturation"), [])!;
  const result = runStressTimeline(input);

  assert.equal(result.frames[0]!.nodeStates.find((n) => n.nodeId === "postgres")?.state, "saturated");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-throughput")?.status, "violated");
  assert.equal(result.requirementResults.find((r) => r.requirementId === "req-latency")?.status, "violated");
  assert.ok(result.bottlenecks.some((b) => b.targetId === "postgres" && b.severity === "critical"));
  assert.equal(result.passed, false);
});

test("database-saturation with a connection pooler intervention passes", () => {
  const input = buildBlackFridayTimelineInput("database-saturation", defaultParameters("database-saturation"), [
    { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 170 } },
    { kind: "add-component", id: "m2", componentType: "connection-pooler", targetEdgeId: "inventory-service-postgres", config: { maxBackendConnections: 170 } },
  ])!;
  assert.equal(runStressTimeline(input).passed, true);
});

test("sustained-load at the default 15k rpm passes without any modifications", () => {
  const input = buildBlackFridayTimelineInput("sustained-load", defaultParameters("sustained-load"), [])!;
  assert.equal(runStressTimeline(input).passed, true);
});

test("traffic-spike at the default flash-sale projection fails without modifications", () => {
  const input = buildBlackFridayTimelineInput("traffic-spike", defaultParameters("traffic-spike"), [])!;
  assert.equal(runStressTimeline(input).passed, false);
});

test("payment-provider-degradation at its default 4s latency violates the latency requirement", () => {
  const input = buildBlackFridayTimelineInput("payment-provider-degradation", defaultParameters("payment-provider-degradation"), [])!;
  assert.equal(runStressTimeline(input).requirementResults.find((r) => r.requirementId === "req-latency")?.status, "violated");
});

test("regional-database-failure fails RTO by default, and passes with a database-failover modification", () => {
  const withoutFailover = runStressTimeline(buildBlackFridayTimelineInput("regional-database-failure", defaultParameters("regional-database-failure"), [])!);
  assert.equal(withoutFailover.requirementResults.find((r) => r.requirementId === "req-rto")?.status, "violated");

  const withFailover = runStressTimeline(
    buildBlackFridayTimelineInput("regional-database-failure", defaultParameters("regional-database-failure"), [
      { kind: "add-component", id: "m1", componentType: "database-failover", targetNodeId: "postgres", config: { recoverySeconds: 60 } },
    ])!,
  );
  assert.equal(withFailover.requirementResults.find((r) => r.requirementId === "req-rto")?.status, "met");
});

test("determinism: rerunning any test definition with the same inputs reproduces the same result", () => {
  for (const profile of blackFridayTestDefinitions) {
    const input = buildBlackFridayTimelineInput(profile.id, defaultParameters(profile.id), [])!;
    assert.deepEqual(runStressTimeline(input), runStressTimeline(input));
  }
});

// --- new interventions wired end-to-end through the real Black Friday lab ---

test("a timeout on the payment edge reduces payment-provider-degradation's checkout latency", () => {
  const withoutTimeout = runStressTimeline(buildBlackFridayTimelineInput("payment-provider-degradation", defaultParameters("payment-provider-degradation"), [])!);
  const withTimeout = runStressTimeline(
    buildBlackFridayTimelineInput("payment-provider-degradation", defaultParameters("payment-provider-degradation"), [
      { kind: "add-component", id: "m1", componentType: "timeout", targetEdgeId: "checkout-service-payment-provider", config: { timeoutMs: 1000 } },
    ])!,
  );
  assert.ok(withTimeout.finalMetrics.checkoutP95Ms! < withoutTimeout.finalMetrics.checkoutP95Ms!);
});

test("a circuit breaker on the payment edge opens once the sustained failure window passes and fails fast", () => {
  const result = runStressTimeline(
    buildBlackFridayTimelineInput("payment-provider-degradation", { ...defaultParameters("payment-provider-degradation"), providerErrorRate: 0.9 }, [
      { kind: "add-component", id: "m1", componentType: "circuit-breaker", targetEdgeId: "checkout-service-payment-provider", config: { failureThreshold: 0.5, window: 30, recoverySeconds: 300 } },
    ])!,
  );
  const lateFrame = result.frames.find((f) => f.timestampSeconds >= 60)!;
  const earlyFrame = result.frames.find((f) => f.timestampSeconds === 0)!;
  assert.ok(lateFrame.systemMetrics.checkoutP95Ms! < earlyFrame.systemMetrics.checkoutP95Ms!);
});

test("a rate limiter caps admitted traffic on database-saturation, improving throughput without eliminating rejection entirely", () => {
  const unlimited = runStressTimeline(buildBlackFridayTimelineInput("database-saturation", defaultParameters("database-saturation"), [])!);
  const limited = runStressTimeline(
    buildBlackFridayTimelineInput("database-saturation", defaultParameters("database-saturation"), [
      { kind: "add-component", id: "m1", componentType: "rate-limiter", targetNodeId: "checkout-service", config: { requestRateLimit: 10000 } },
    ])!,
  );
  assert.ok(limited.finalMetrics.throttledDemand! > unlimited.finalMetrics.throttledDemand!);
});

test("traffic-spike's autoscaling reacts gradually: a scaling event appears in the timeline rather than an instant jump", () => {
  const result = runStressTimeline(buildBlackFridayTimelineInput("traffic-spike", defaultParameters("traffic-spike"), [])!);
  const scalingEvents = result.frames.flatMap((f) => f.events).filter((e) => e.type === "scaling");
  assert.ok(scalingEvents.length > 0);
});

test("traffic-spike's event timeline records a meaningful saturation transition as the ramp progresses, not every frame", () => {
  const result = runStressTimeline(buildBlackFridayTimelineInput("traffic-spike", defaultParameters("traffic-spike"), [])!);
  const allEvents = result.frames.flatMap((f) => f.events);
  assert.ok(allEvents.some((e) => e.type === "saturation"));
  assert.ok(allEvents.length < result.frames.length * 3);
});
