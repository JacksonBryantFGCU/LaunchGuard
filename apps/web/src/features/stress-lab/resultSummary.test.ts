import { test } from "node:test";
import assert from "node:assert/strict";
import type { SimulationBottleneck, SimulationRequirementResult } from "@redline/shared";
import { countRequirementStatuses, primaryBottleneck, formatRequirementScore, correlateRequirementBottleneck } from "./resultSummary.js";

const requirements: SimulationRequirementResult[] = [
  { requirementId: "a", status: "met", explanation: "x" },
  { requirementId: "b", status: "violated", explanation: "x" },
  { requirementId: "c", status: "at_risk", explanation: "x" },
  { requirementId: "d", status: "met", explanation: "x" },
];

test("countRequirementStatuses tallies pass/at-risk/fail", () => {
  assert.deepEqual(countRequirementStatuses(requirements), { met: 2, at_risk: 1, violated: 1, total: 4 });
});

test("formatRequirementScore renders as N / M passing", () => {
  assert.equal(formatRequirementScore(countRequirementStatuses(requirements)), "2 / 4 passing");
});

test("primaryBottleneck picks the highest-severity bottleneck", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "node", targetId: "checkout-service", metric: "Concurrency", observed: "102%", threshold: "100%", severity: "high", explanation: "x" },
    { targetType: "node", targetId: "postgres", metric: "Connections", observed: "500/500", threshold: "500", severity: "critical", explanation: "x" },
  ];
  assert.equal(primaryBottleneck(bottlenecks)?.targetId, "postgres");
});

test("primaryBottleneck is undefined when there are none", () => {
  assert.equal(primaryBottleneck([]), undefined);
});

test("correlateRequirementBottleneck matches via targetId mentioned in the requirement's explanation", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "node", targetId: "postgres", metric: "Connections", observed: "500/500", threshold: "500", severity: "critical", explanation: "x" },
  ];
  const requirement: SimulationRequirementResult = {
    requirementId: "req-checkout-latency",
    status: "violated",
    explanation: "postgres exhausted its connection pool, blocking checkout writes.",
  };
  assert.equal(correlateRequirementBottleneck(requirement, bottlenecks)?.targetId, "postgres");
});

test("correlateRequirementBottleneck matches via metric name mentioned in observedValue", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "edge", targetId: "checkout-to-payment", metric: "Provider Latency", observed: "4200ms", threshold: "2000ms", severity: "high", explanation: "x" },
  ];
  const requirement: SimulationRequirementResult = {
    requirementId: "req-p95",
    status: "violated",
    observedValue: "Provider Latency spiked past target",
    explanation: "checkout p95 exceeded target",
  };
  assert.equal(correlateRequirementBottleneck(requirement, bottlenecks)?.targetId, "checkout-to-payment");
});

test("correlateRequirementBottleneck returns undefined rather than guessing when nothing matches", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "node", targetId: "redis-cache", metric: "Hit Rate", observed: "10%", threshold: "80%", severity: "low", explanation: "x" },
  ];
  const requirement: SimulationRequirementResult = { requirementId: "req-unrelated", status: "met", explanation: "Everything held within target." };
  assert.equal(correlateRequirementBottleneck(requirement, bottlenecks), undefined);
});

test("correlateRequirementBottleneck prefers the higher-severity match when several bottlenecks mention overlapping text", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "node", targetId: "checkout-service", metric: "Concurrency", observed: "102%", threshold: "100%", severity: "medium", explanation: "x" },
    { targetType: "node", targetId: "postgres", metric: "Connections", observed: "500/500", threshold: "500", severity: "critical", explanation: "x" },
  ];
  const requirement: SimulationRequirementResult = {
    requirementId: "req-availability",
    status: "violated",
    explanation: "checkout-service and postgres both saturated during the spike.",
  };
  assert.equal(correlateRequirementBottleneck(requirement, bottlenecks)?.targetId, "postgres");
});
