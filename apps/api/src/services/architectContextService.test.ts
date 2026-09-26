import { test } from "node:test";
import assert from "node:assert/strict";
import { getInternalScenarioBySlug } from "@redline/scenarios/internal";
import { buildArchitectConversationContext } from "./architectContextService.js";

const scenario = getInternalScenarioBySlug("black-friday-checkout")!;
const context = buildArchitectConversationContext(scenario);
const serialized = JSON.stringify(context);

test("every dynamic variable value is a plain string", () => {
  for (const value of Object.values(context)) {
    assert.equal(typeof value, "string");
  }
});

test("includes the architect identity", () => {
  assert.equal(context.architect_name, "Alex Chen");
  assert.equal(context.architect_role, "Senior Software Engineer");
});

test("includes the scenario title and public description", () => {
  assert.equal(context.scenario_title, scenario.title);
  assert.ok(context.system_summary.includes("checkout"));
});

test("includes functional and non-functional requirements", () => {
  assert.ok(context.requirements_context.includes("15,000 requests/minute"));
  assert.ok(context.requirements_context.includes("99.95%"));
});

test("includes architecture components and connections", () => {
  assert.ok(context.architecture_context.includes("Checkout Service"));
  assert.ok(context.architecture_context.includes("Payment Provider"));
  assert.ok(context.architecture_context.includes("Postgres") || context.architecture_context.includes("Orders DB"));
});

test("includes architect assumptions, rationale, and tradeoffs", () => {
  for (const assumption of scenario.architectContext.assumptions) {
    assert.ok(context.architect_assumptions.includes(assumption));
  }
  for (const rationale of scenario.architectContext.rationale) {
    assert.ok(context.architect_rationale.includes(rationale));
  }
  for (const tradeoff of scenario.architectContext.knownTradeoffs) {
    assert.ok(context.architect_tradeoffs.includes(tradeoff));
  }
});

// This is the critical boundary test: nothing from the answer key may reach
// the architect's runtime context under any key.
test("excludes every hidden-risk answer-key field", () => {
  // Deliberately not checking risk.title/description verbatim: Alex's own
  // genuine rationale/tradeoffs can legitimately describe the same real
  // architectural fact a hidden risk also describes (e.g. both mention
  // single-region persistence), which is expected, not a leak. The actual
  // answer-key material - the risk id and the reviewer-insight text written
  // to grade a *human's* finding - must never appear regardless.
  for (const risk of scenario.hiddenRisks) {
    assert.ok(!serialized.includes(risk.id), `leaked hidden risk id ${risk.id}`);
    assert.ok(!serialized.includes(risk.expectedReviewerInsight), `leaked expectedReviewerInsight for ${risk.id}`);
  }
});

test("excludes every stress-test field and value", () => {
  for (const stressTest of scenario.stressTests) {
    assert.ok(!serialized.includes(stressTest.id), `leaked stress test id ${stressTest.id}`);
    assert.ok(!serialized.includes(stressTest.explanation), `leaked stress test explanation for ${stressTest.id}`);
    assert.ok(!serialized.includes(stressTest.observedBehavior), `leaked observedBehavior for ${stressTest.id}`);
  }
});

test("excludes the evaluation rubric entirely", () => {
  for (const dimension of scenario.evaluationRubric.dimensions) {
    assert.ok(!serialized.includes(dimension.description), `leaked rubric dimension description for ${dimension.key}`);
  }
  assert.equal((context as Record<string, unknown>).evaluationRubric, undefined);
});

test("does not expose a correct recommendation", () => {
  assert.equal((context as Record<string, unknown>).recommendation, undefined);
  assert.equal((context as Record<string, unknown>).correctRecommendation, undefined);
});
