import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyMetricChange,
  classifyRequirementChange,
  isStrictComparison,
  compareRequirementResults,
} from "./comparison.js";

test("lower-is-better metric: latency dropping is an improvement", () => {
  assert.equal(classifyMetricChange("checkoutP95Ms", 3000, 700), "improved");
});

test("lower-is-better metric: error rate rising is a regression", () => {
  assert.equal(classifyMetricChange("errorRatePercent", 2, 8), "regressed");
});

test("higher-is-better metric: availability rising is an improvement", () => {
  assert.equal(classifyMetricChange("availabilityPercent", 99.4, 99.97), "improved");
});

test("higher-is-better metric: availability dropping is a regression", () => {
  assert.equal(classifyMetricChange("availabilityPercent", 99.97, 99.8), "regressed");
});

test("equal values are unchanged regardless of direction", () => {
  assert.equal(classifyMetricChange("checkoutP95Ms", 500, 500), "unchanged");
});

test("an unrecognized metric key is never assumed larger-is-better - falls back to unchanged rather than guessing", () => {
  assert.equal(classifyMetricChange("somethingNew", 10, 20), "unchanged");
});

test("requirement: fail to pass is improved", () => {
  assert.equal(classifyRequirementChange("violated", "met"), "improved");
});

test("requirement: at_risk to pass is improved", () => {
  assert.equal(classifyRequirementChange("at_risk", "met"), "improved");
});

test("requirement: pass to fail is regressed", () => {
  assert.equal(classifyRequirementChange("met", "violated"), "regressed");
});

test("requirement: fail to at_risk is improved", () => {
  assert.equal(classifyRequirementChange("violated", "at_risk"), "improved");
});

test("requirement: pass to pass is unchanged", () => {
  assert.equal(classifyRequirementChange("met", "met"), "unchanged");
});

test("compareRequirementResults pairs by requirementId and classifies each", () => {
  const baseline = [
    { requirementId: "req-latency", status: "violated" as const, explanation: "x" },
    { requirementId: "req-availability", status: "met" as const, explanation: "x" },
  ];
  const current = [
    { requirementId: "req-latency", status: "met" as const, explanation: "x" },
    { requirementId: "req-availability", status: "met" as const, explanation: "x" },
  ];
  const diff = compareRequirementResults(baseline, current);
  assert.deepEqual(diff.find((d) => d.requirementId === "req-latency"), {
    requirementId: "req-latency",
    from: "violated",
    to: "met",
    change: "improved",
  });
  assert.equal(diff.find((d) => d.requirementId === "req-availability")?.change, "unchanged");
});

test("strict comparison requires the same test id and identical parameters", () => {
  assert.equal(isStrictComparison("database-saturation", { a: 1 }, "database-saturation", { a: 1 }), true);
});

test("changed parameters break strict comparison even for the same test", () => {
  assert.equal(isStrictComparison("database-saturation", { a: 1 }, "database-saturation", { a: 2 }), false);
});

test("a different test is never a strict comparison", () => {
  assert.equal(isStrictComparison("database-saturation", { a: 1 }, "traffic-spike", { a: 1 }), false);
});
