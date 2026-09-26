import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialReviewSessionState, reviewSessionReducer } from "./reviewSessionReducer.js";

const initial = () => createInitialReviewSessionState("payment-retry", "a.ts");

test("selecting a file updates selectedFile and marks it reviewed", () => {
  const next = reviewSessionReducer(initial(), { type: "SELECT_FILE", file: "b.ts" });
  assert.equal(next.selectedFile, "b.ts");
  assert.ok(next.reviewedFiles.has("b.ts"));
  assert.ok(next.reviewedFiles.has("a.ts"));
});

test("adding a comment preserves existing comments", () => {
  const withOne = reviewSessionReducer(initial(), {
    type: "ADD_COMMENT",
    comment: { id: "1", file: "a.ts", startLine: 1, endLine: 1, body: "hi", createdAt: "now" },
  });
  const withTwo = reviewSessionReducer(withOne, {
    type: "ADD_COMMENT",
    comment: { id: "2", file: "b.ts", startLine: 5, endLine: 6, body: "hey", createdAt: "now" },
  });
  assert.equal(withTwo.comments.length, 2);
});

test("comments survive switching files", () => {
  const withComment = reviewSessionReducer(initial(), {
    type: "ADD_COMMENT",
    comment: { id: "1", file: "a.ts", startLine: 1, endLine: 1, body: "hi", createdAt: "now" },
  });
  const afterSwitch = reviewSessionReducer(withComment, { type: "SELECT_FILE", file: "b.ts" });
  assert.equal(afterSwitch.comments.length, 1);
  assert.equal(afterSwitch.comments[0].file, "a.ts");
});

test("deleting a comment removes only that comment", () => {
  const state = [
    { id: "1", file: "a.ts", startLine: 1, endLine: 1, body: "one", createdAt: "now" },
    { id: "2", file: "a.ts", startLine: 2, endLine: 2, body: "two", createdAt: "now" },
  ].reduce((s, comment) => reviewSessionReducer(s, { type: "ADD_COMMENT", comment }), initial());

  const afterDelete = reviewSessionReducer(state, { type: "DELETE_COMMENT", id: "1" });
  assert.equal(afterDelete.comments.length, 1);
  assert.equal(afterDelete.comments[0].id, "2");
});

test("setting reviewer notes updates state", () => {
  const next = reviewSessionReducer(initial(), { type: "SET_NOTES", notes: "looks risky" });
  assert.equal(next.reviewerNotes, "looks risky");
});

test("stores decision and final explanation", () => {
  const withDecision = reviewSessionReducer(initial(), { type: "SET_DECISION", decision: "request_changes" });
  assert.equal(withDecision.decision, "request_changes");

  const withExplanation = reviewSessionReducer(withDecision, {
    type: "SET_FINAL_EXPLANATION",
    text: "Retries can duplicate a charge.",
  });
  assert.equal(withExplanation.finalExplanation, "Retries can duplicate a charge.");
});

test("submission moves draft -> submitting -> submitted", () => {
  const submitting = reviewSessionReducer(initial(), { type: "SUBMIT_START" });
  assert.equal(submitting.submissionStatus, "submitting");

  const submitted = reviewSessionReducer(submitting, {
    type: "SUBMIT_SUCCESS",
    reviewId: "abc-123",
    submittedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(submitted.submissionStatus, "submitted");
  assert.equal(submitted.reviewId, "abc-123");
});

test("a failed submission returns to an editable error state", () => {
  const submitting = reviewSessionReducer(initial(), { type: "SUBMIT_START" });
  const errored = reviewSessionReducer(submitting, { type: "SUBMIT_ERROR", message: "network down" });
  assert.equal(errored.submissionStatus, "error");

  const stillEditable = reviewSessionReducer(errored, { type: "SET_NOTES", notes: "retrying" });
  assert.equal(stillEditable.reviewerNotes, "retrying");
});

test("comments, notes, and decisions are locked once submitted", () => {
  const submitting = reviewSessionReducer(initial(), { type: "SUBMIT_START" });
  const submitted = reviewSessionReducer(submitting, {
    type: "SUBMIT_SUCCESS",
    reviewId: "abc-123",
    submittedAt: "2026-01-01T00:00:00.000Z",
  });

  const afterCommentAttempt = reviewSessionReducer(submitted, {
    type: "ADD_COMMENT",
    comment: { id: "1", file: "a.ts", startLine: 1, endLine: 1, body: "too late", createdAt: "now" },
  });
  assert.equal(afterCommentAttempt.comments.length, 0);

  const afterNotesAttempt = reviewSessionReducer(submitted, { type: "SET_NOTES", notes: "too late" });
  assert.equal(afterNotesAttempt.reviewerNotes, "");

  const afterDecisionAttempt = reviewSessionReducer(submitted, { type: "SET_DECISION", decision: "approve" });
  assert.equal(afterDecisionAttempt.decision, null);
});

test("file selection still works for inspection after submission, without changing reviewed set", () => {
  const submitting = reviewSessionReducer(initial(), { type: "SUBMIT_START" });
  const submitted = reviewSessionReducer(submitting, {
    type: "SUBMIT_SUCCESS",
    reviewId: "abc-123",
    submittedAt: "2026-01-01T00:00:00.000Z",
  });

  const afterSelect = reviewSessionReducer(submitted, { type: "SELECT_FILE", file: "b.ts" });
  assert.equal(afterSelect.selectedFile, "b.ts");
  assert.equal(afterSelect.reviewedFiles.has("b.ts"), false);
});

test("voice call moves idle -> connecting -> connected -> ending -> ended", () => {
  let s = reviewSessionReducer(initial(), { type: "SET_VOICE_STATUS", status: "connecting" });
  assert.equal(s.voiceStatus, "connecting");
  s = reviewSessionReducer(s, { type: "SET_VOICE_STATUS", status: "connected" });
  assert.equal(s.voiceStatus, "connected");
  s = reviewSessionReducer(s, { type: "SET_VOICE_STATUS", status: "ending" });
  assert.equal(s.voiceStatus, "ending");
  s = reviewSessionReducer(s, { type: "SET_VOICE_STATUS", status: "ended" });
  assert.equal(s.voiceStatus, "ended");
});

test("voice call moves to error from connecting or connected", () => {
  const fromConnecting = reviewSessionReducer(
    reviewSessionReducer(initial(), { type: "SET_VOICE_STATUS", status: "connecting" }),
    { type: "SET_VOICE_STATUS", status: "error", errorMessage: "mic denied" },
  );
  assert.equal(fromConnecting.voiceStatus, "error");
  assert.equal(fromConnecting.voiceErrorMessage, "mic denied");

  const fromConnected = reviewSessionReducer(
    reviewSessionReducer(initial(), { type: "SET_VOICE_STATUS", status: "connected" }),
    { type: "SET_VOICE_STATUS", status: "error", errorMessage: "disconnected" },
  );
  assert.equal(fromConnected.voiceStatus, "error");
});

test("transcript entries accumulate and are not blocked by review lock", () => {
  const submitting = reviewSessionReducer(initial(), { type: "SUBMIT_START" });
  const submitted = reviewSessionReducer(submitting, {
    type: "SUBMIT_SUCCESS",
    reviewId: "abc-123",
    submittedAt: "2026-01-01T00:00:00.000Z",
  });

  const withEntry = reviewSessionReducer(submitted, {
    type: "ADD_TRANSCRIPT_ENTRY",
    entry: { id: "t1", speaker: "developer", text: "So the client gets an immediate result.", timestamp: "2026-01-01T00:00:00.000Z", final: true },
  });
  assert.equal(withEntry.transcript.length, 1);
});

test("conversation ID is stored", () => {
  const next = reviewSessionReducer(initial(), { type: "SET_CONVERSATION_ID", conversationId: "conv-1" });
  assert.equal(next.conversationId, "conv-1");
});
