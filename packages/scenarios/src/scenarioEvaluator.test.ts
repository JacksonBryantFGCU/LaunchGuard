import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScenarioResponse } from "@redline/shared";
import { evaluateScenarioResponse } from "./scenarioEvaluator.js";
import { InternalPracticeScenarioSchema } from "./internalPracticeScenario.js";

const scenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "payment-provider-degradation",
    order: 2,
    title: "Payment Provider Degradation",
    shortDescription: "Payment provider latency has spiked.",
    situation: "The external payment provider's latency has increased dramatically while checkout traffic remains high.",
    objective: "Diagnose the cause and decide what to do about it.",
    requirementIds: ["req-latency", "req-availability"],
    investigationPrompts: ["What would you check first?"],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    { id: "sync-dependency", label: "Synchronous dependency", phrases: ["synchronous", "waits synchronously", "blocking call"], teaching: "A synchronous call couples checkout's availability to the provider's." },
  ],
  acceptedInvestigationConcepts: [
    { id: "check-provider-latency", label: "Check provider latency", phrases: ["provider latency", "p99"], teaching: "Provider latency metrics show whether the dependency itself has degraded." },
  ],
  acceptedImmediateActionConcepts: [
    { id: "bounded-timeout", label: "Bounded timeout", phrases: ["timeout", "fail fast"], teaching: "A bounded timeout stops one slow dependency from exhausting worker capacity." },
  ],
  acceptedArchitectureDecisionConcepts: [
    { id: "circuit-breaker", label: "Circuit breaker", phrases: ["circuit breaker", "bulkhead"], teaching: "A circuit breaker isolates a degrading dependency instead of letting every request pay its latency." },
  ],
  severityTruth: "high",
  linkedHiddenRiskIds: ["risk-missing-timeout", "risk-payment-dependency"],
  linkedStressTestIds: ["stress-payment-degradation"],
  expectedRequirementIds: ["req-latency", "req-availability"],
  relevantEvidenceIds: ["ev-payment-p99"],
});

function baseResponse(overrides: Partial<ScenarioResponse> = {}): ScenarioResponse {
  return {
    diagnosis: "not sure",
    investigationPlan: "not sure",
    immediateAction: "not sure",
    architectureDecision: "not sure",
    tradeoff: "not sure",
    severity: "low",
    affectedRequirementIds: [],
    evidenceIds: [],
    ...overrides,
  };
}

test("strong diagnosis + strong action scores the full 16 points", () => {
  const result = evaluateScenarioResponse(
    baseResponse({
      diagnosis: "Checkout waits synchronously on the payment provider.",
      immediateAction: "Add a bounded timeout so we fail fast instead of blocking.",
      architectureDecision: "Wrap the payment call in a circuit breaker.",
      affectedRequirementIds: ["req-latency", "req-availability"],
      evidenceIds: ["ev-payment-p99"],
    }),
    scenario,
  );
  assert.equal(result.objectiveScore, 16);
  assert.equal(result.diagnosisScore, 6);
  assert.equal(result.evidenceRequirementScore, 4);
  assert.equal(result.immediateActionScore, 3);
  assert.equal(result.architectureDecisionScore, 3);
});

test("correct diagnosis / weak action scores diagnosis but not action", () => {
  const result = evaluateScenarioResponse(
    baseResponse({ diagnosis: "Checkout waits synchronously on the payment provider." }),
    scenario,
  );
  assert.equal(result.diagnosisScore, 6);
  assert.equal(result.immediateActionScore, 0);
  assert.equal(result.architectureDecisionScore, 0);
});

test("weak diagnosis / good action scores action but not diagnosis", () => {
  const result = evaluateScenarioResponse(
    baseResponse({
      immediateAction: "Add a bounded timeout.",
      architectureDecision: "Wrap the call in a circuit breaker.",
    }),
    scenario,
  );
  assert.equal(result.diagnosisScore, 0);
  assert.equal(result.immediateActionScore, 3);
  assert.equal(result.architectureDecisionScore, 3);
});

test("correct action / irrelevant evidence does not earn evidence credit", () => {
  const result = evaluateScenarioResponse(
    baseResponse({
      immediateAction: "Add a bounded timeout.",
      evidenceIds: ["ev-traffic-normal"],
    }),
    scenario,
  );
  assert.equal(result.evidenceUsed, false);
  assert.equal(result.evidenceRequirementScore, 0);
});

test("correct concepts / wrong requirement loses the requirement half-credit", () => {
  const result = evaluateScenarioResponse(
    baseResponse({
      diagnosis: "Checkout waits synchronously on the payment provider.",
      evidenceIds: ["ev-payment-p99"],
      affectedRequirementIds: ["req-throughput"],
    }),
    scenario,
  );
  assert.deepEqual(result.matchedRequirementIds, []);
  assert.equal(result.evidenceUsed, true);
  assert.equal(result.evidenceRequirementScore, 2);
});

test("understated severity is reported but does not affect the objective score", () => {
  const result = evaluateScenarioResponse(baseResponse({ severity: "low" }), scenario);
  assert.equal(result.severityAligned, false);
  assert.equal(result.submittedSeverity, "low");
  assert.equal(result.expectedSeverity, "high");
});

test("a vague response with no matching concepts scores zero", () => {
  const result = evaluateScenarioResponse(baseResponse(), scenario);
  assert.equal(result.objectiveScore, 0);
});

test("concept checks report every concept, matched and missed", () => {
  const result = evaluateScenarioResponse(
    baseResponse({ diagnosis: "Checkout waits synchronously on the payment provider." }),
    scenario,
  );
  assert.equal(result.diagnosisConcepts.length, 1);
  assert.equal(result.diagnosisConcepts[0].matched, true);
  assert.equal(result.immediateActionConcepts[0].matched, false);
});
