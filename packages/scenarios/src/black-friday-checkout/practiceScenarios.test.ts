import { test } from "node:test";
import assert from "node:assert/strict";
import { blackFridayCheckoutInternalScenario } from "./internal.js";
import { blackFridayPracticeScenarios } from "./practiceScenarios.js";
import { blackFridayTestDefinitions } from "../stressLab/blackFridayStressLab.js";

function scenarioById(id: string) {
  return blackFridayPracticeScenarios.find((s) => s.publicScenario.id === id)!;
}

test("defines exactly five practice scenarios in order", () => {
  assert.equal(blackFridayPracticeScenarios.length, 5);
  assert.deepEqual(
    blackFridayPracticeScenarios.map((s) => s.publicScenario.order),
    [1, 2, 3, 4, 5],
  );
});

test("titles match the spec's five situations", () => {
  assert.deepEqual(
    blackFridayPracticeScenarios.map((s) => s.publicScenario.title),
    [
      "Checkout Latency Spike",
      "Payment Provider Degradation",
      "Duplicate Checkout Requests",
      "Black Friday Capacity Surge",
      "Regional Database Failure",
    ],
  );
});

test("every linked hidden risk id is real", () => {
  const realRiskIds = new Set(blackFridayCheckoutInternalScenario.hiddenRisks.map((r) => r.id));
  for (const scenario of blackFridayPracticeScenarios) {
    for (const riskId of scenario.linkedHiddenRiskIds) {
      assert.ok(realRiskIds.has(riskId), `${scenario.publicScenario.id} references unknown risk ${riskId}`);
    }
  }
});

test("every linked stress test id is real", () => {
  const realStressIds = new Set(blackFridayCheckoutInternalScenario.stressTests.map((t) => t.id));
  for (const scenario of blackFridayPracticeScenarios) {
    for (const stressId of scenario.linkedStressTestIds) {
      assert.ok(realStressIds.has(stressId), `${scenario.publicScenario.id} references unknown stress test ${stressId}`);
    }
  }
});

test("every expected/public requirement id is real", () => {
  const realRequirementIds = new Set(blackFridayCheckoutInternalScenario.requirements.map((r) => r.id));
  for (const scenario of blackFridayPracticeScenarios) {
    for (const id of scenario.expectedRequirementIds) {
      assert.ok(realRequirementIds.has(id), `${scenario.publicScenario.id} references unknown requirement ${id}`);
    }
    for (const id of scenario.publicScenario.requirementIds) {
      assert.ok(realRequirementIds.has(id), `${scenario.publicScenario.id} public scenario references unknown requirement ${id}`);
    }
  }
});

test("every relevant evidence id is real", () => {
  const realEvidenceIds = new Set(blackFridayCheckoutInternalScenario.evidence.map((e) => e.id));
  for (const scenario of blackFridayPracticeScenarios) {
    for (const id of scenario.relevantEvidenceIds) {
      assert.ok(realEvidenceIds.has(id), `${scenario.publicScenario.id} references unknown evidence ${id}`);
    }
  }
});

test("every stressLabTestId is real: a typo fails tests rather than silently producing an empty Stress Lab", () => {
  const realTestIds = new Set(blackFridayTestDefinitions.map((t) => t.id));
  for (const scenario of blackFridayPracticeScenarios) {
    for (const id of scenario.stressLabTestIds) {
      assert.ok(realTestIds.has(id), `${scenario.publicScenario.id} references unknown Stress Lab test ${id}`);
    }
  }
});

test("no scenario lists the same stressLabTestId twice", () => {
  for (const scenario of blackFridayPracticeScenarios) {
    assert.equal(scenario.stressLabTestIds.length, new Set(scenario.stressLabTestIds).size, `${scenario.publicScenario.id} has duplicate stressLabTestIds`);
  }
});

test("checkout-latency-spike maps to sustained-load (and payment-provider-degradation)", () => {
  assert.deepEqual(scenarioById("checkout-latency-spike").stressLabTestIds, ["sustained-load", "payment-provider-degradation"]);
});

test("payment-provider-degradation maps to payment-provider-degradation (and sustained-load)", () => {
  assert.deepEqual(scenarioById("payment-provider-degradation").stressLabTestIds, ["payment-provider-degradation", "sustained-load"]);
});

test("black-friday-capacity-surge maps to traffic-spike, database-saturation, and sustained-load", () => {
  assert.deepEqual(scenarioById("black-friday-capacity-surge").stressLabTestIds, ["traffic-spike", "database-saturation", "sustained-load"]);
});

test("regional-database-failure maps only to regional-database-failure", () => {
  assert.deepEqual(scenarioById("regional-database-failure").stressLabTestIds, ["regional-database-failure"]);
});

test("duplicate-checkout-requests is intentionally unsupported: no current Stress Lab test represents duplicate-request/idempotency behavior", () => {
  assert.deepEqual(scenarioById("duplicate-checkout-requests").stressLabTestIds, []);
});

test("does not directly reveal the expected cause in the situation text", () => {
  const idempotencyScenario = blackFridayPracticeScenarios.find((s) => s.publicScenario.id === "duplicate-checkout-requests")!;
  assert.doesNotMatch(idempotencyScenario.publicScenario.situation.toLowerCase(), /idempoten/);

  const timeoutScenario = blackFridayPracticeScenarios.find((s) => s.publicScenario.id === "payment-provider-degradation")!;
  assert.doesNotMatch(timeoutScenario.publicScenario.situation.toLowerCase(), /timeout/);
});
