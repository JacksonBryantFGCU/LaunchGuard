import { test } from "node:test";
import assert from "node:assert/strict";
import { toPublicScenario, toPublicStressTests } from "../internalScenario.js";
import { blackFridayCheckoutInternalScenario as scenario } from "./internal.js";

test("hidden risk IDs are unique", () => {
  const ids = scenario.hiddenRisks.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("hidden risks reference real nodes and edges", () => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  const edgeIds = new Set(scenario.edges.map((e) => e.id));
  for (const risk of scenario.hiddenRisks) {
    for (const id of risk.affectedNodeIds) assert.ok(nodeIds.has(id), `risk ${risk.id} references unknown node ${id}`);
    for (const id of risk.affectedEdgeIds) assert.ok(edgeIds.has(id), `risk ${risk.id} references unknown edge ${id}`);
  }
});

test("hidden risks reference real requirement IDs", () => {
  const requirementIds = new Set(scenario.requirements.map((r) => r.id));
  for (const risk of scenario.hiddenRisks) {
    for (const id of risk.requirementIds) {
      assert.ok(requirementIds.has(id), `risk ${risk.id} references unknown requirement ${id}`);
    }
  }
});

test("stress-test risk references resolve to real hidden risks", () => {
  const riskIds = new Set(scenario.hiddenRisks.map((r) => r.id));
  for (const stressTest of scenario.stressTests) {
    for (const id of stressTest.revealsRiskIds) {
      assert.ok(riskIds.has(id), `stress test ${stressTest.id} references unknown risk ${id}`);
    }
  }
});

test("stress-test affected nodes and edges are real", () => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  const edgeIds = new Set(scenario.edges.map((e) => e.id));
  for (const stressTest of scenario.stressTests) {
    for (const id of stressTest.affectedNodes) assert.ok(nodeIds.has(id), `stress test ${stressTest.id} references unknown node ${id}`);
    for (const id of stressTest.affectedEdges) assert.ok(edgeIds.has(id), `stress test ${stressTest.id} references unknown edge ${id}`);
  }
});

test("evaluation rubric weights total 100", () => {
  const total = scenario.evaluationRubric.dimensions.reduce((sum, d) => sum + d.weight, 0);
  assert.equal(total, 100);
});

test("public projection excludes all private scenario truth", () => {
  const pub = toPublicScenario(scenario) as Record<string, unknown>;
  assert.equal(pub.hiddenRisks, undefined);
  assert.equal(pub.stressTests, undefined);
  assert.equal(pub.evaluationRubric, undefined);
  assert.equal(pub.architectContext, undefined);

  const serialized = JSON.stringify(pub);
  for (const risk of scenario.hiddenRisks) {
    assert.ok(!serialized.includes(risk.id), `leaked hidden risk id ${risk.id}`);
    assert.ok(!serialized.includes(risk.expectedReviewerInsight), `leaked expectedReviewerInsight for ${risk.id}`);
    assert.ok(!serialized.includes(risk.description), `leaked hidden risk description for ${risk.id}`);
  }
  for (const stressTest of scenario.stressTests) {
    assert.ok(!serialized.includes(stressTest.id), `leaked stress test id ${stressTest.id}`);
    assert.ok(!serialized.includes(stressTest.explanation), `leaked stress test explanation for ${stressTest.id}`);
  }
});

test("all six Black Friday stress tests are authored", () => {
  assert.equal(scenario.stressTests.length, 6);
});

test("every stress test has at least one ordered step", () => {
  for (const stressTest of scenario.stressTests) {
    assert.ok(stressTest.steps.length > 0, `stress test ${stressTest.id} has no steps`);
    const sequences = stressTest.steps.map((s) => s.sequence);
    assert.deepEqual(sequences, stressTest.steps.map((_, i) => i + 1), `stress test ${stressTest.id} steps are not sequentially ordered`);
  }
});

test("stress test step node/edge/requirement references resolve to real scenario objects", () => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  const edgeIds = new Set(scenario.edges.map((e) => e.id));
  const requirementIds = new Set(scenario.requirements.map((r) => r.id));
  for (const stressTest of scenario.stressTests) {
    for (const step of stressTest.steps) {
      for (const effect of step.nodeEffects) assert.ok(nodeIds.has(effect.nodeId), `step ${step.id} references unknown node ${effect.nodeId}`);
      for (const effect of step.edgeEffects) assert.ok(edgeIds.has(effect.edgeId), `step ${step.id} references unknown edge ${effect.edgeId}`);
      for (const impact of step.requirementImpacts) {
        assert.ok(requirementIds.has(impact.requirementId), `step ${step.id} references unknown requirement ${impact.requirementId}`);
      }
    }
  }
});

test("toPublicStressTests projects every authored stress test", () => {
  const reveals = toPublicStressTests(scenario);
  assert.equal(reveals.length, scenario.stressTests.length);
});

// Information-leakage audit for the Phase 5 reveal boundary: the reviewer-
// visible stress-test projection must never carry the hidden-risk mapping
// or any other private answer-key material.
test("toPublicStressTests excludes revealsRiskIds and all hidden-risk answer-key material", () => {
  const reveals = toPublicStressTests(scenario) as unknown as Record<string, unknown>[];
  const serialized = JSON.stringify(reveals);
  for (const reveal of reveals) {
    assert.equal(reveal.revealsRiskIds, undefined);
  }
  // Not checked verbatim: risk.matchingConcepts (generic technical terms like
  // "idempotency" legitimately also appear in the stress test's own authored
  // explanation of real system behavior - that overlap is expected, not a
  // leak of answer-key machinery). The id and reviewer-insight text are the
  // actual private grading material and must never appear.
  for (const risk of scenario.hiddenRisks) {
    assert.ok(!serialized.includes(risk.id), `leaked hidden risk id ${risk.id}`);
    assert.ok(!serialized.includes(risk.expectedReviewerInsight), `leaked expectedReviewerInsight for ${risk.id}`);
  }
  for (const dimension of scenario.evaluationRubric.dimensions) {
    assert.ok(!serialized.includes(dimension.description), `leaked rubric dimension description for ${dimension.key}`);
  }
});

test("public projection still contains teaching metadata and architecture data", () => {
  const pub = toPublicScenario(scenario);
  assert.ok(pub.learningObjective.length > 0);
  assert.ok(pub.instructions.length > 0);
  assert.ok(pub.expectedDeliverables.length > 0);
  assert.ok(pub.nodes.length > 0);
  assert.ok(pub.requirements.length > 0);
});
