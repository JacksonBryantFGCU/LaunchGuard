import { test } from "node:test";
import assert from "node:assert/strict";
import { getInternalScenarioBySlug } from "@redline/scenarios";
import { buildDeveloperContext } from "./developerContextService.js";

const scenario = getInternalScenarioBySlug("payment-retry")!;

test("includes legitimate developer context", () => {
  const context = buildDeveloperContext(scenario);
  assert.equal(context.developer_name, "Alex Chen");
  assert.ok(context.developer_role.length > 0);
  assert.ok(context.developer_behavior.length > 0);
  assert.ok(context.developer_rationale.length > 0);
  assert.ok(context.developer_known_facts.length > 0);
  assert.equal(context.pr_number, "142");
  assert.ok(context.pr_title.length > 0);
  assert.ok(context.pr_description.length > 0);
});

test("excludes hidden scenario truth", () => {
  const context = buildDeveloperContext(scenario);
  const serialized = JSON.stringify(context);

  for (const issue of scenario.hiddenIssues) {
    assert.ok(!serialized.includes(issue.id), `leaked hidden issue id ${issue.id}`);
    assert.ok(!serialized.includes(issue.title), `leaked hidden issue title ${issue.title}`);
    assert.ok(!serialized.includes(issue.expectedReviewerInsight));
  }
  for (const hiddenTest of scenario.hiddenTests) {
    assert.ok(!serialized.includes(hiddenTest.id));
  }
  for (const dimension of scenario.evaluationRubric.dimensions) {
    assert.ok(!serialized.includes(dimension.id));
  }

  const keys = Object.keys(context);
  assert.ok(!keys.some((k) => k.toLowerCase().includes("hidden")));
  assert.ok(!keys.some((k) => k.toLowerCase().includes("rubric")));
  assert.ok(!keys.some((k) => k.toLowerCase().includes("evaluation")));
});
