import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentRetryScenario } from "./payment-retry/scenario.js";
import { toPublicReviewScenario, toScenarioPreview } from "./projection.js";

test("public projection excludes hidden scenario truth", () => {
  const publicScenario = toPublicReviewScenario(paymentRetryScenario) as Record<string, unknown>;
  assert.equal(publicScenario.hiddenIssues, undefined);
  assert.equal(publicScenario.hiddenTests, undefined);
  assert.equal(publicScenario.evaluationRubric, undefined);
  assert.equal(publicScenario.developerPersona, undefined);
});

test("public projection keeps reviewer-visible file contents", () => {
  const publicScenario = toPublicReviewScenario(paymentRetryScenario);
  assert.equal(publicScenario.files.length, paymentRetryScenario.files.length);
  assert.ok(publicScenario.files.every((f) => typeof f.newContent === "string" && f.newContent.length >= 0));
});

test("scenario preview stays lightweight", () => {
  const preview = toScenarioPreview(paymentRetryScenario) as Record<string, unknown>;
  assert.equal(preview.files, undefined);
  assert.equal(preview.hiddenIssues, undefined);
  assert.equal(preview.pullRequest, undefined);
});
