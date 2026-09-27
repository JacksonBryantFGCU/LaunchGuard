import { test } from "node:test";
import assert from "node:assert/strict";
import { ScenarioResponseSchema } from "./scenarioResponse.js";

function validResponse(overrides: Record<string, unknown> = {}) {
  return {
    diagnosis: "Payment provider latency is propagating into checkout latency.",
    investigationPlan: "Check payment provider p99 latency and checkout timeout config.",
    immediateAction: "Add a bounded timeout on the payment provider call.",
    architectureDecision: "Introduce a circuit breaker around the payment provider dependency.",
    tradeoff: "Failing fast risks rejecting some checkouts that would have succeeded.",
    severity: "high",
    affectedRequirementIds: ["req-latency"],
    evidenceIds: ["ev-payment-p99"],
    ...overrides,
  };
}

test("accepts a fully filled-out response", () => {
  assert.doesNotThrow(() => ScenarioResponseSchema.parse(validResponse()));
});

test("accepts an optional confidence level", () => {
  assert.doesNotThrow(() => ScenarioResponseSchema.parse(validResponse({ confidence: "medium" })));
});

test("rejects an empty diagnosis", () => {
  assert.throws(() => ScenarioResponseSchema.parse(validResponse({ diagnosis: "" })));
});

test("rejects an empty immediate action", () => {
  assert.throws(() => ScenarioResponseSchema.parse(validResponse({ immediateAction: "" })));
});

test("rejects an invalid severity", () => {
  assert.throws(() => ScenarioResponseSchema.parse(validResponse({ severity: "catastrophic" })));
});

test("rejects an invalid confidence", () => {
  assert.throws(() => ScenarioResponseSchema.parse(validResponse({ confidence: "extreme" })));
});
