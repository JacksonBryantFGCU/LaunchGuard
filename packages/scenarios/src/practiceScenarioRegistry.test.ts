import { test } from "node:test";
import assert from "node:assert/strict";
import { listPracticeScenarios, getPracticeScenarioById } from "./practiceScenarioRegistry.js";

test("lists the five Black Friday practice scenarios in order", () => {
  const scenarios = listPracticeScenarios();
  assert.equal(scenarios.length, 5);
  assert.deepEqual(scenarios.map((s) => s.order), [1, 2, 3, 4, 5]);
});

test("looks up a practice scenario by id", () => {
  const scenario = getPracticeScenarioById("payment-provider-degradation");
  assert.ok(scenario);
  assert.equal(scenario?.title, "Payment Provider Degradation");
});

test("returns undefined for an unknown id", () => {
  assert.equal(getPracticeScenarioById("nonexistent"), undefined);
});

test("public listing never leaks scoring truth", () => {
  const scenarios = listPracticeScenarios();
  for (const scenario of scenarios) {
    for (const leaked of [
      "expectedConcepts",
      "acceptedInvestigationConcepts",
      "acceptedImmediateActionConcepts",
      "acceptedArchitectureDecisionConcepts",
      "severityTruth",
      "linkedHiddenRiskIds",
      "linkedStressTestIds",
      "relevantEvidenceIds",
    ]) {
      assert.equal(leaked in scenario, false, `${leaked} leaked into the public listing`);
    }
  }
});
