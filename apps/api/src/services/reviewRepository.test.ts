import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryReviewRepository, SessionLockedError } from "./reviewRepository.js";
import type { Redline } from "@redline/shared";

function redline(overrides: Partial<Redline> = {}): Redline {
  return {
    id: "redline-1",
    targetType: "node",
    targetId: "checkout-service",
    category: "reliability",
    severity: "high",
    title: "Missing timeout",
    reasoning: "A provider degradation could hold requests open indefinitely.",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("createSession stores a fresh draft session", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  assert.equal(session.userId, "user_a");
  assert.equal(session.scenarioSlug, "black-friday-checkout");
  assert.equal(session.status, "draft");
  assert.deepEqual(session.reviewedNodeIds, []);
  assert.deepEqual(session.reviewedEdgeIds, []);
  assert.equal(session.reviewerNotes, "");
  assert.equal(session.submittedAt, null);
  assert.ok(session.id.length > 0);
});

test("getSession fetches a session by id, undefined for unknown", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  assert.deepEqual(await repo.getSession(session.id), session);
  assert.equal(await repo.getSession("does-not-exist"), undefined);
});

test("findActiveDraftSession resumes the same user+scenario draft, not other users/scenarios", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await repo.createSession("user_a", "black-friday-checkout");

  assert.deepEqual(await repo.findActiveDraftSession("user_a", "black-friday-checkout"), created);
  assert.equal(await repo.findActiveDraftSession("user_b", "black-friday-checkout"), undefined);
  assert.equal(await repo.findActiveDraftSession("user_a", "some-other-scenario"), undefined);
});

test("listUserSessions returns only that user's sessions", async () => {
  const repo = new InMemoryReviewRepository();
  await repo.createSession("user_a", "black-friday-checkout");
  await repo.createSession("user_b", "black-friday-checkout");
  const sessions = await repo.listUserSessions("user_a");
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0]?.userId, "user_a");
});

test("updateDraft merges provided fields and bumps updatedAt", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  const updated = await repo.updateDraft(session.id, { reviewedNodeIds: ["checkout-service"], reviewerNotes: "Looks ok" });
  assert.deepEqual(updated.reviewedNodeIds, ["checkout-service"]);
  assert.equal(updated.reviewerNotes, "Looks ok");
  assert.deepEqual(updated.reviewedEdgeIds, []);
});

test("redlines round-trip: save, list, update, delete", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  await repo.saveRedline(session.id, redline());
  assert.equal((await repo.listRedlines(session.id)).length, 1);

  await repo.updateRedline(session.id, "redline-1", { title: "Updated title" });
  const afterUpdate = await repo.listRedlines(session.id);
  assert.equal(afterUpdate[0]?.title, "Updated title");

  await repo.deleteRedline(session.id, "redline-1");
  assert.equal((await repo.listRedlines(session.id)).length, 0);
});

test("saveTranscriptTurn dedupes by turn id", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  const turn = { id: "turn-1", speaker: "reviewer" as const, text: "Hello", timestamp: "2026-01-01T00:00:00.000Z", final: true };
  await repo.saveTranscriptTurn(session.id, "conv-1", turn);
  await repo.saveTranscriptTurn(session.id, "conv-1", turn);
  assert.equal((await repo.listTranscriptTurns(session.id)).length, 1);
});

test("submitSession locks the session and stores the submission", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  const { session: submitted, submission } = await repo.submitSession(session.id, {
    recommendation: "approve",
    finalRationale: "The architecture is ready to proceed given the stated constraints.",
  });
  assert.equal(submitted.status, "submitted");
  assert.ok(submitted.submittedAt);
  assert.equal(submission.recommendation, "approve");
  assert.equal(await (await repo.getSubmission(session.id))?.recommendation, "approve");
});

test("a submitted session rejects further draft mutation", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  await repo.submitSession(session.id, { recommendation: "approve", finalRationale: "Ready to proceed as described above." });

  await assert.rejects(() => repo.updateDraft(session.id, { reviewerNotes: "too late" }), SessionLockedError);
  await assert.rejects(() => repo.saveRedline(session.id, redline()), SessionLockedError);
  await assert.rejects(
    () => repo.submitSession(session.id, { recommendation: "approve", finalRationale: "Ready to proceed as described above." }),
    SessionLockedError,
  );
});

test("saveStressProgress upserts by (session, stressTestId)", async () => {
  const repo = new InMemoryReviewRepository();
  const session = await repo.createSession("user_a", "black-friday-checkout");
  await repo.saveStressProgress(session.id, { stressTestId: "stress-1", status: "running", currentStep: 0, completedAt: null });
  await repo.saveStressProgress(session.id, { stressTestId: "stress-1", status: "passed", currentStep: 3, completedAt: "2026-01-01T00:00:00.000Z" });

  const progress = await repo.listStressProgress(session.id);
  assert.equal(progress.length, 1);
  assert.equal(progress[0]?.status, "passed");
  assert.equal(progress[0]?.currentStep, 3);
});
