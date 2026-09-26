import { test } from "node:test";
import assert from "node:assert/strict";
import { submitReview, ReviewValidationError } from "./reviewService.js";

function validSubmission() {
  return {
    scenarioSlug: "payment-retry",
    reviewedFiles: ["src/payments/paymentService.ts", "src/routes/checkout.ts"],
    comments: [
      { id: "1", file: "src/payments/paymentService.ts", startLine: 10, endLine: 12, body: "No idempotency key here." },
    ],
    reviewerNotes: "Checking retry safety.",
    decision: "request_changes",
    finalExplanation: "Retries can duplicate a charge because no idempotency key is reused across attempts.",
  };
}

test("accepts a valid review for a known scenario", () => {
  const result = submitReview(validSubmission());
  assert.equal(result.scenarioSlug, "payment-retry");
  assert.equal(result.status, "submitted");
  assert.equal(result.decision, "request_changes");
});

test("generates a unique review ID and server-side timestamp", () => {
  const a = submitReview(validSubmission());
  const b = submitReview(validSubmission());
  assert.notEqual(a.reviewId, b.reviewId);
  assert.ok(!Number.isNaN(Date.parse(a.submittedAt)));
});

test("computes accurate summary counts", () => {
  const result = submitReview(validSubmission());
  assert.equal(result.commentCount, 1);
  assert.equal(result.filesReviewed, 2);
  assert.equal(result.totalFiles, 3);
});

test("rejects an unknown scenario", () => {
  assert.throws(() => submitReview({ ...validSubmission(), scenarioSlug: "nonexistent" }), ReviewValidationError);
});

test("rejects a reviewed-file path that does not exist in the scenario", () => {
  const submission = validSubmission();
  submission.reviewedFiles = ["src/does/not/exist.ts"];
  assert.throws(() => submitReview(submission), ReviewValidationError);
});

test("rejects a comment referencing an unknown file", () => {
  const submission = validSubmission();
  submission.comments = [{ id: "1", file: "src/does/not/exist.ts", startLine: 1, endLine: 1, body: "hmm" }];
  assert.throws(() => submitReview(submission), ReviewValidationError);
});

test("result never contains hidden scenario truth", () => {
  const result = submitReview(validSubmission()) as Record<string, unknown>;
  const allowedKeys = new Set([
    "reviewId",
    "scenarioSlug",
    "status",
    "submittedAt",
    "decision",
    "commentCount",
    "filesReviewed",
    "totalFiles",
  ]);
  for (const key of Object.keys(result)) {
    assert.ok(allowedKeys.has(key), `unexpected key on review result: ${key}`);
  }
});
