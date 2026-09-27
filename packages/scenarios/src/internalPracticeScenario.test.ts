import { test } from "node:test";
import assert from "node:assert/strict";
import { InternalPracticeScenarioSchema, toPublicPracticeScenario } from "./internalPracticeScenario.js";

function validConceptGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: "bounded-timeout",
    label: "Bounded timeout",
    phrases: ["timeout", "bounded timeout", "fail fast"],
    teaching: "A request without a timeout can hold worker capacity indefinitely when a dependency degrades.",
    ...overrides,
  };
}

function validInternal(overrides: Record<string, unknown> = {}) {
  return {
    publicScenario: {
      id: "checkout-latency-spike",
      order: 1,
      title: "Checkout Latency Spike",
      shortDescription: "Checkout p95 latency has exceeded target.",
      situation: "Checkout p95 latency has exceeded the 800 ms target during a moderate traffic increase.",
      objective: "Diagnose the cause and decide what to do about it.",
      requirementIds: ["req-latency"],
      investigationPrompts: ["What would you check first?"],
      availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
    },
    expectedConcepts: [validConceptGroup()],
    acceptedInvestigationConcepts: [validConceptGroup()],
    acceptedImmediateActionConcepts: [validConceptGroup()],
    acceptedArchitectureDecisionConcepts: [validConceptGroup()],
    severityTruth: "high",
    linkedHiddenRiskIds: ["risk-missing-timeout"],
    linkedStressTestIds: ["stress-payment-degradation"],
    stressLabTestIds: ["payment-provider-degradation"],
    expectedRequirementIds: ["req-latency"],
    relevantEvidenceIds: ["ev-payment-p99"],
    ...overrides,
  };
}

test("accepts a fully-formed internal practice scenario", () => {
  assert.doesNotThrow(() => InternalPracticeScenarioSchema.parse(validInternal()));
});

test("rejects a scenario with no linked stress test", () => {
  assert.throws(() => InternalPracticeScenarioSchema.parse(validInternal({ linkedStressTestIds: [] })));
});

test("stressLabTestIds defaults to an empty array when omitted (intentionally unsupported scenarios need no override)", () => {
  const withoutField = validInternal();
  delete (withoutField as { stressLabTestIds?: string[] }).stressLabTestIds;
  const parsed = InternalPracticeScenarioSchema.parse(withoutField);
  assert.deepEqual(parsed.stressLabTestIds, []);
});

test("stressLabTestIds accepts an explicit empty array (e.g. duplicate-checkout, which has no valid stress-lab test yet)", () => {
  const parsed = InternalPracticeScenarioSchema.parse(validInternal({ stressLabTestIds: [] }));
  assert.deepEqual(parsed.stressLabTestIds, []);
});

test("stressLabTestIds accepts one or more interactive Stress Lab test ids, distinct from the legacy linkedStressTestIds namespace", () => {
  const parsed = InternalPracticeScenarioSchema.parse(validInternal({ stressLabTestIds: ["sustained-load", "payment-provider-degradation"] }));
  assert.deepEqual(parsed.stressLabTestIds, ["sustained-load", "payment-provider-degradation"]);
});

test("rejects a scenario with no expected concepts", () => {
  assert.throws(() => InternalPracticeScenarioSchema.parse(validInternal({ expectedConcepts: [] })));
});

test("toPublicPracticeScenario strips every private field", () => {
  const internal = InternalPracticeScenarioSchema.parse(validInternal());
  const pub = toPublicPracticeScenario(internal);
  assert.equal(pub.id, "checkout-latency-spike");
  for (const leaked of [
    "expectedConcepts",
    "acceptedInvestigationConcepts",
    "acceptedImmediateActionConcepts",
    "acceptedArchitectureDecisionConcepts",
    "severityTruth",
    "linkedHiddenRiskIds",
    "linkedStressTestIds",
    "stressLabTestIds",
    "expectedRequirementIds",
    "relevantEvidenceIds",
  ]) {
    assert.equal(leaked in pub, false, `${leaked} leaked into the public projection`);
  }
});
