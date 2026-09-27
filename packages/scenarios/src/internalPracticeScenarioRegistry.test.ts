import { test } from "node:test";
import assert from "node:assert/strict";
import { getInternalPracticeScenarioById } from "./internalPracticeScenarioRegistry.js";

test("looks up private practice scenario truth by id", () => {
  const scenario = getInternalPracticeScenarioById("duplicate-checkout-requests");
  assert.ok(scenario);
  assert.ok(scenario!.expectedConcepts.length > 0);
});

test("returns undefined for an unknown id", () => {
  assert.equal(getInternalPracticeScenarioById("nonexistent"), undefined);
});
