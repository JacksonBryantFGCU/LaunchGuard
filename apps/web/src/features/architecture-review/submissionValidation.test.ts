import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialReviewState, type ReviewState } from "./reviewState.js";
import { validateSubmission } from "./submissionValidation.js";

function completeState(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    ...createInitialReviewState("black-friday-checkout"),
    recommendation: "request_redesign",
    finalRationale: "The architecture requires redesign before implementation given the risks noted above.",
    ...overrides,
  };
}

test("accepts a complete draft", () => {
  const result = validateSubmission(completeState());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.submission.recommendation, "request_redesign");
    assert.ok(result.submission.finalRationale.length >= 20);
  }
});

test("rejects a draft with no recommendation selected", () => {
  const result = validateSubmission(completeState({ recommendation: null }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.recommendation);
});

test("rejects a draft with too-short final rationale", () => {
  const result = validateSubmission(completeState({ finalRationale: "too short" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.finalRationale);
});

test("rejects a draft with blank final rationale after trimming", () => {
  const result = validateSubmission(completeState({ finalRationale: "                     " }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.finalRationale);
});

test("does not require redlines, notes, or full reviewed coverage", () => {
  const result = validateSubmission(
    completeState({ redlines: [], reviewerNotes: "", reviewedNodeIds: [], reviewedEdgeIds: [] }),
  );
  assert.equal(result.ok, true);
});
