import { test } from "node:test";
import assert from "node:assert/strict";
import type { StressSimulationRunRecord } from "@purgatory/shared";
import { groupRunsByTest, deriveBaselineRun, latestRun, describeModificationDelta } from "./runHistory.js";

function fakeRun(overrides: Partial<StressSimulationRunRecord> = {}): StressSimulationRunRecord {
  return {
    id: "run-1",
    attemptId: "attempt-1",
    testId: "database-saturation",
    runNumber: 1,
    parameters: {},
    modifications: [],
    passed: false,
    finalMetrics: {},
    requirementResults: [],
    bottlenecks: [],
    summary: "s",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("groupRunsByTest buckets runs by testId, preserving order within each bucket", () => {
  const runs = [
    fakeRun({ id: "a", testId: "database-saturation", runNumber: 1 }),
    fakeRun({ id: "b", testId: "traffic-spike", runNumber: 1 }),
    fakeRun({ id: "c", testId: "database-saturation", runNumber: 2 }),
  ];
  const grouped = groupRunsByTest(runs);
  assert.deepEqual(grouped["database-saturation"]!.map((r) => r.id), ["a", "c"]);
  assert.deepEqual(grouped["traffic-spike"]!.map((r) => r.id), ["b"]);
});

test("deriveBaselineRun is the lowest runNumber for that test, regardless of array order", () => {
  const runs = [fakeRun({ id: "second", runNumber: 2 }), fakeRun({ id: "first", runNumber: 1 })];
  assert.equal(deriveBaselineRun(runs)?.id, "first");
});

test("deriveBaselineRun is undefined for an empty run list", () => {
  assert.equal(deriveBaselineRun([]), undefined);
});

test("latestRun is the highest runNumber for that test", () => {
  const runs = [fakeRun({ id: "first", runNumber: 1 }), fakeRun({ id: "third", runNumber: 3 }), fakeRun({ id: "second", runNumber: 2 })];
  assert.equal(latestRun(runs)?.id, "third");
});

test("switching test has a separate baseline: history for one test never influences another", () => {
  const runs = [fakeRun({ id: "a", testId: "database-saturation", runNumber: 1 }), fakeRun({ id: "b", testId: "traffic-spike", runNumber: 1 })];
  const grouped = groupRunsByTest(runs);
  assert.equal(deriveBaselineRun(grouped["database-saturation"]!)?.id, "a");
  assert.equal(deriveBaselineRun(grouped["traffic-spike"]!)?.id, "b");
});

test("describeModificationDelta labels the baseline run with no modifications as Baseline", () => {
  assert.equal(describeModificationDelta([]), "Baseline");
});

test("describeModificationDelta names a single added component", () => {
  const mods = [{ kind: "add-component" as const, id: "m1", componentType: "connection-pooler", config: {} }];
  assert.equal(describeModificationDelta(mods), "+ Connection Pooler");
});

test("describeModificationDelta summarizes multiple changes by count rather than guessing a narrative", () => {
  const mods = [
    { kind: "add-component" as const, id: "m1", componentType: "connection-pooler", config: {} },
    { kind: "add-component" as const, id: "m2", componentType: "cache", config: {} },
  ];
  assert.equal(describeModificationDelta(mods), "2 design changes");
});
