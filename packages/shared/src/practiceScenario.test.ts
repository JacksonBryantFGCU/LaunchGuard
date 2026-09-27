import { test } from "node:test";
import assert from "node:assert/strict";
import { PracticeScenarioSchema, ScenarioEvaluationResultSchema } from "./practiceScenario.js";

function validScenario(overrides: Record<string, unknown> = {}) {
  return {
    id: "checkout-latency-spike",
    order: 1,
    title: "Checkout Latency Spike",
    shortDescription: "Checkout p95 latency has exceeded target during a moderate traffic increase.",
    situation:
      "Checkout p95 latency has exceeded the 800 ms target during a moderate increase in traffic. No major service is completely unavailable.",
    objective: "Diagnose the cause and decide what to do about it.",
    requirementIds: ["req-latency"],
    investigationPrompts: ["What would you check first?"],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
    ...overrides,
  };
}

test("accepts a fully filled-out practice scenario", () => {
  assert.doesNotThrow(() => PracticeScenarioSchema.parse(validScenario()));
});

test("accepts an optional estimatedMinutes", () => {
  assert.doesNotThrow(() => PracticeScenarioSchema.parse(validScenario({ estimatedMinutes: 15 })));
});

test("rejects a scenario with no investigation prompts", () => {
  assert.throws(() => PracticeScenarioSchema.parse(validScenario({ investigationPrompts: [] })));
});

test("rejects a scenario with no available resource types", () => {
  assert.throws(() => PracticeScenarioSchema.parse(validScenario({ availableResourceTypes: [] })));
});

test("rejects an unknown resource type", () => {
  assert.throws(() =>
    PracticeScenarioSchema.parse(validScenario({ availableResourceTypes: ["architecture", "leaderboard"] })),
  );
});

test("does not require nodeIds/edgeIds - architecture is optional supporting context", () => {
  const scenario = PracticeScenarioSchema.parse(validScenario());
  assert.equal("nodeIds" in scenario, false);
  assert.equal("edgeIds" in scenario, false);
});

function validEvaluationResult(overrides: Record<string, unknown> = {}) {
  return {
    scenarioId: "checkout-latency-spike",
    objectiveScore: 16,
    maxObjectiveScore: 16,
    diagnosisScore: 6,
    evidenceRequirementScore: 4,
    immediateActionScore: 3,
    architectureDecisionScore: 3,
    diagnosisConcepts: [{ id: "concept-1", label: "Bounded timeout", matched: true, teaching: "Why this matters." }],
    immediateActionConcepts: [],
    architectureDecisionConcepts: [],
    matchedRequirementIds: ["req-latency"],
    missedRequirementIds: [],
    evidenceUsed: true,
    submittedSeverity: "high",
    expectedSeverity: "high",
    severityAligned: true,
    ...overrides,
  };
}

test("accepts a well-formed evaluation result", () => {
  assert.doesNotThrow(() => ScenarioEvaluationResultSchema.parse(validEvaluationResult()));
});

test("evaluation result never carries scoring-truth fields", () => {
  const parsed = ScenarioEvaluationResultSchema.parse({
    ...validEvaluationResult(),
    expectedConcepts: ["should not survive"],
    rubric: { anything: true },
  });
  assert.equal("expectedConcepts" in parsed, false);
  assert.equal("rubric" in parsed, false);
});

test("rejects an objective score above the max", () => {
  assert.throws(() => ScenarioEvaluationResultSchema.parse(validEvaluationResult({ objectiveScore: 17 })));
});
