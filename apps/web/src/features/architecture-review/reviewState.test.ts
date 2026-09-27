import { test } from "node:test";
import assert from "node:assert/strict";
import type { ArchitectConversationTurn, Redline } from "@purgatory/shared";
import { createInitialReviewState, isReviewLocked, redlinesForTarget, reviewReducer, type ReviewState } from "./reviewState.js";

function turn(overrides: Partial<ArchitectConversationTurn> = {}): ArchitectConversationTurn {
  return {
    id: "turn-1",
    speaker: "reviewer",
    text: "Why is the payment call synchronous?",
    timestamp: "2026-01-01T00:00:00.000Z",
    final: true,
    ...overrides,
  };
}

function redline(overrides: Partial<Redline> = {}): Redline {
  return {
    id: "redline-1",
    targetType: "edge",
    targetId: "checkout-service-payment-provider",
    category: "reliability",
    severity: "high",
    title: "Missing timeout",
    reasoning: "A slow provider response can hold checkout capacity open.",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("marks a node reviewed", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "checkout-service" });
  assert.deepEqual(next.reviewedNodeIds, ["checkout-service"]);
});

test("marking the same node reviewed twice does not duplicate it", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "checkout-service" });
  state = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "checkout-service" });
  assert.deepEqual(state.reviewedNodeIds, ["checkout-service"]);
});

test("marks an edge reviewed", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "MARK_EDGE_REVIEWED", edgeId: "checkout-service-postgres" });
  assert.deepEqual(next.reviewedEdgeIds, ["checkout-service-postgres"]);
});

test("adds a redline", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  assert.equal(next.redlines.length, 1);
  assert.equal(next.redlines[0]!.id, "redline-1");
});

test("edits a redline in place", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  state = reviewReducer(state, {
    type: "UPDATE_REDLINE",
    id: "redline-1",
    draft: {
      targetType: "edge",
      targetId: "checkout-service-payment-provider",
      category: "reliability",
      severity: "critical",
      title: "Missing timeout (updated)",
      reasoning: "Updated reasoning that is long enough to pass validation.",
    },
  });
  assert.equal(state.redlines[0]!.severity, "critical");
  assert.equal(state.redlines[0]!.title, "Missing timeout (updated)");
});

test("deletes a redline", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  state = reviewReducer(state, { type: "DELETE_REDLINE", id: "redline-1" });
  assert.equal(state.redlines.length, 0);
});

test("redlines survive unrelated selection/notes changes", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  state = reviewReducer(state, { type: "SET_NOTES", notes: "Ask about failover." });
  state = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "postgres" });
  assert.equal(state.redlines.length, 1);
});

test("notes update", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "SET_NOTES", notes: "Ask about failover." });
  assert.equal(next.reviewerNotes, "Ask about failover.");
});

test("progress counts derive correctly", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "checkout-service" });
  state = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "postgres" });
  state = reviewReducer(state, { type: "MARK_EDGE_REVIEWED", edgeId: "checkout-service-postgres" });
  assert.equal(state.reviewedNodeIds.length, 2);
  assert.equal(state.reviewedEdgeIds.length, 1);
});

test("redlinesForTarget filters by target type and id", () => {
  let state: ReviewState = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline({ id: "r1" }) });
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline({ id: "r2", targetType: "node", targetId: "postgres" }) });
  assert.equal(redlinesForTarget(state, "edge", "checkout-service-payment-provider").length, 1);
  assert.equal(redlinesForTarget(state, "node", "postgres").length, 1);
  assert.equal(redlinesForTarget(state, "node", "redis").length, 0);
});

test("sets the recommendation", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "SET_RECOMMENDATION", recommendation: "request_redesign" });
  assert.equal(next.recommendation, "request_redesign");
});

test("sets the final rationale", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "SET_FINAL_RATIONALE", rationale: "The architecture needs rework." });
  assert.equal(next.finalRationale, "The architecture needs rework.");
});

test("draft moves to submitting on SUBMIT_START", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "SUBMIT_START" });
  assert.equal(next.submissionStatus, "submitting");
  assert.equal(isReviewLocked(next), true);
});

test("submitting moves to submitted on SUBMIT_SUCCESS and records server-generated fields", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "SUBMIT_START" });
  state = reviewReducer(state, { type: "SUBMIT_SUCCESS", reviewId: "review-1", submittedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(state.submissionStatus, "submitted");
  assert.equal(state.reviewId, "review-1");
  assert.equal(state.submittedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(isReviewLocked(state), true);
});

test("submitting moves to error on SUBMIT_ERROR and unlocks for retry", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "SUBMIT_START" });
  state = reviewReducer(state, { type: "SUBMIT_ERROR", message: "Network error." });
  assert.equal(state.submissionStatus, "error");
  assert.equal(state.submissionError, "Network error.");
  assert.equal(isReviewLocked(state), false);
});

test("mutations are blocked once the review is submitted", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "SUBMIT_START" });
  state = reviewReducer(state, { type: "SUBMIT_SUCCESS", reviewId: "review-1", submittedAt: "2026-01-01T00:00:00.000Z" });

  const afterMarkNode = reviewReducer(state, { type: "MARK_NODE_REVIEWED", nodeId: "checkout-service" });
  const afterMarkEdge = reviewReducer(state, { type: "MARK_EDGE_REVIEWED", edgeId: "checkout-service-postgres" });
  const afterAddRedline = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  const afterNotes = reviewReducer(state, { type: "SET_NOTES", notes: "changed" });
  const afterRecommendation = reviewReducer(state, { type: "SET_RECOMMENDATION", recommendation: "approve" });
  const afterRationale = reviewReducer(state, { type: "SET_FINAL_RATIONALE", rationale: "changed rationale text" });

  assert.deepEqual(afterMarkNode, state);
  assert.deepEqual(afterMarkEdge, state);
  assert.deepEqual(afterAddRedline, state);
  assert.deepEqual(afterNotes, state);
  assert.deepEqual(afterRecommendation, state);
  assert.deepEqual(afterRationale, state);
});

test("duplicate SUBMIT_START while already submitting is a no-op", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "SUBMIT_START" });
  const again = reviewReducer(state, { type: "SUBMIT_START" });
  assert.deepEqual(again, state);
});

test("voice: idle moves to connecting", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, { type: "VOICE_CONNECTING" });
  assert.equal(next.voiceStatus, "connecting");
});

test("voice: connecting moves to connected and records the conversation id", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_CONNECTED", conversationId: "conv-1", startedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(state.voiceStatus, "connected");
  assert.equal(state.conversationId, "conv-1");
  assert.equal(state.conversationStartedAt, "2026-01-01T00:00:00.000Z");
});

test("voice: connected moves to ending on end request", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_CONNECTED", conversationId: "conv-1", startedAt: "2026-01-01T00:00:00.000Z" });
  state = reviewReducer(state, { type: "VOICE_END_REQUESTED" });
  assert.equal(state.voiceStatus, "ending");
});

test("voice: ending moves to ended and records the end timestamp", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_CONNECTED", conversationId: "conv-1", startedAt: "2026-01-01T00:00:00.000Z" });
  state = reviewReducer(state, { type: "VOICE_END_REQUESTED" });
  state = reviewReducer(state, { type: "VOICE_ENDED", endedAt: "2026-01-01T00:05:00.000Z" });
  assert.equal(state.voiceStatus, "ended");
  assert.equal(state.conversationEndedAt, "2026-01-01T00:05:00.000Z");
});

test("voice: connecting moves to error", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_ERROR", message: "Microphone access was denied." });
  assert.equal(state.voiceStatus, "error");
  assert.equal(state.voiceError, "Microphone access was denied.");
});

test("voice: connected moves to error", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_CONNECTED", conversationId: "conv-1", startedAt: "2026-01-01T00:00:00.000Z" });
  state = reviewReducer(state, { type: "VOICE_ERROR", message: "Provider connection lost." });
  assert.equal(state.voiceStatus, "error");
});

test("voice: a submitted review cannot start a new conversation", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "SUBMIT_START" });
  state = reviewReducer(state, { type: "SUBMIT_SUCCESS", reviewId: "review-1", submittedAt: "2026-01-01T00:00:00.000Z" });
  const next = reviewReducer(state, { type: "VOICE_CONNECTING" });
  assert.equal(next.voiceStatus, "idle");
  assert.deepEqual(next, state);
});

test("voice: appending the same turn id twice does not duplicate it", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn() });
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn() });
  assert.equal(state.transcript.length, 1);
});

test("voice: turns append in order", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn({ id: "turn-1", speaker: "reviewer" }) });
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn({ id: "turn-2", speaker: "architect", text: "Because..." }) });
  assert.deepEqual(
    state.transcript.map((t) => t.id),
    ["turn-1", "turn-2"],
  );
});

test("voice: a correction replaces the last architect turn instead of appending a duplicate", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn({ id: "turn-1", speaker: "reviewer" }) });
  state = reviewReducer(state, { type: "VOICE_APPEND_TURN", turn: turn({ id: "turn-2", speaker: "architect", text: "original answer" }) });
  state = reviewReducer(state, { type: "VOICE_CORRECT_LAST_ARCHITECT_TURN", text: "corrected answer" });
  assert.equal(state.transcript.length, 2);
  assert.equal(state.transcript[1]!.text, "corrected answer");
});

test("voice failure does not reset redlines, notes, recommendation, or rationale", () => {
  let state = createInitialReviewState("black-friday-checkout");
  state = reviewReducer(state, { type: "ADD_REDLINE", redline: redline() });
  state = reviewReducer(state, { type: "SET_NOTES", notes: "Ask about failover." });
  state = reviewReducer(state, { type: "SET_RECOMMENDATION", recommendation: "request_redesign" });
  state = reviewReducer(state, { type: "SET_FINAL_RATIONALE", rationale: "Needs rework." });
  state = reviewReducer(state, { type: "VOICE_CONNECTING" });
  state = reviewReducer(state, { type: "VOICE_ERROR", message: "Provider unavailable." });
  assert.equal(state.redlines.length, 1);
  assert.equal(state.reviewerNotes, "Ask about failover.");
  assert.equal(state.recommendation, "request_redesign");
  assert.equal(state.finalRationale, "Needs rework.");
});

test("hydrating from a draft session restores in-progress work and the session id", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, {
    type: "HYDRATE_FROM_SESSION",
    session: {
      id: "session-1",
      scenarioSlug: "black-friday-checkout",
      status: "draft",
      reviewedNodeIds: ["checkout-service"],
      reviewedEdgeIds: [],
      reviewerNotes: "draft note",
      redlines: [redline()],
      transcript: [turn()],
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: null,
      recommendation: null,
      finalRationale: null,
      stressProgress: [],
    },
  });
  assert.equal(next.reviewSessionId, "session-1");
  assert.deepEqual(next.reviewedNodeIds, ["checkout-service"]);
  assert.equal(next.redlines.length, 1);
  assert.equal(next.reviewerNotes, "draft note");
  assert.equal(next.transcript.length, 1);
  assert.equal(next.submissionStatus, "draft");
});

test("hydrating from a submitted session restores the locked, submitted view", () => {
  const state = createInitialReviewState("black-friday-checkout");
  const next = reviewReducer(state, {
    type: "HYDRATE_FROM_SESSION",
    session: {
      id: "session-1",
      scenarioSlug: "black-friday-checkout",
      status: "submitted",
      reviewedNodeIds: ["checkout-service"],
      reviewedEdgeIds: ["checkout-service-postgres"],
      reviewerNotes: "final note",
      redlines: [redline()],
      transcript: [],
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: "2026-01-02T00:00:00.000Z",
      recommendation: "approve",
      finalRationale: "Ready to proceed.",
      stressProgress: [],
    },
  });
  assert.equal(next.submissionStatus, "submitted");
  assert.equal(next.reviewId, "session-1");
  assert.equal(next.submittedAt, "2026-01-02T00:00:00.000Z");
  assert.equal(next.recommendation, "approve");
  assert.equal(next.finalRationale, "Ready to proceed.");
  assert.ok(isReviewLocked(next));
});
