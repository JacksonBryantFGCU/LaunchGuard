import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStressLabVoiceContext, suggestedQuestionsForFocus } from "./architectContext.js";

test("buildStressLabVoiceContext omits fields that were not selected, never fabricates them", () => {
  const context = buildStressLabVoiceContext({});
  assert.deepEqual(context, {});
});

test("buildStressLabVoiceContext only includes safe, already-observed fields that were passed", () => {
  const context = buildStressLabVoiceContext({
    focusLabel: "Postgres",
    bottleneckSummary: "Connections: 500/500 (threshold 500)",
    requirementSummary: "Checkout p95 under 500ms: FAIL",
    metricsSummary: "dbUtilizationPercent=100",
  });
  assert.equal(context.focusLabel, "Postgres");
  assert.equal(context.bottleneckSummary, "Connections: 500/500 (threshold 500)");
  assert.equal(context.requirementSummary, "Checkout p95 under 500ms: FAIL");
  assert.equal(context.metricsSummary, "dbUtilizationPercent=100");
});

test("suggestedQuestionsForFocus asks about database behavior for a database-flavored bottleneck", () => {
  const questions = suggestedQuestionsForFocus({ metric: "Connections", targetId: "postgres" });
  assert.ok(questions.some((q) => /database|connection/i.test(q)));
});

test("suggestedQuestionsForFocus asks about provider/timeout behavior for a provider-flavored bottleneck", () => {
  const questions = suggestedQuestionsForFocus({ metric: "Latency", targetId: "payment-provider" });
  assert.ok(questions.some((q) => /provider|timeout|retr/i.test(q)));
});

test("suggestedQuestionsForFocus falls back to generic component questions when nothing matches a known flavor", () => {
  const questions = suggestedQuestionsForFocus({ metric: "Something Else", targetId: "mystery-node" });
  assert.ok(questions.length > 0);
});

test("suggestedQuestionsForFocus never reveals a scoring answer - no question mentions fixing or adding anything", () => {
  const allQuestions = [
    ...suggestedQuestionsForFocus({ metric: "Connections", targetId: "postgres" }),
    ...suggestedQuestionsForFocus({ metric: "Latency", targetId: "payment-provider" }),
    ...suggestedQuestionsForFocus({ metric: "Something Else", targetId: "mystery-node" }),
  ];
  for (const q of allQuestions) {
    assert.ok(!/should (add|use|switch|increase)/i.test(q), `question reveals an answer: ${q}`);
  }
});
