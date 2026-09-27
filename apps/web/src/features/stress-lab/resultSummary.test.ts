import { test } from "node:test";
import assert from "node:assert/strict";
import type { SimulationBottleneck, SimulationRequirementResult } from "@redline/shared";
import { countRequirementStatuses, primaryBottleneck, formatRequirementScore } from "./resultSummary.js";

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
