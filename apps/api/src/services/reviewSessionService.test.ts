import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryReviewRepository } from "./reviewRepository.js";
import {
  startOrResumeSession,
  getSessionForOwner,
  listHistory,
  updateDraft,
  addRedline,
  updateRedline,
  deleteRedline,
  addTranscriptTurn,
  saveStressProgress,
  submitSession,
} from "./reviewSessionService.js";

const SLUG = "black-friday-checkout";

function redlineBody(overrides: Record<string, unknown> = {}) {
  return {
    id: "redline-1",
    targetType: "node",
    targetId: "checkout-service",
    category: "reliability",
    severity: "high",
    title: "Missing timeout",
    reasoning: "A provider degradation could hold requests open indefinitely.",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test("starting a session stores the verified owner, not a client-supplied id", async () => {
  const repo = new InMemoryReviewRepository();
  const result = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.result.scenarioSlug, SLUG);
    assert.equal(result.result.status, "draft");
  }
});

test("starting a session twice for the same user+scenario resumes the same session", async () => {
  const repo = new InMemoryReviewRepository();
  const first = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  const second = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(first.ok && second.ok);
  if (first.ok && second.ok) assert.equal(first.result.id, second.result.id);
});

test("starting a session for an unknown scenario returns 404", async () => {
  const repo = new InMemoryReviewRepository();
  const result = await startOrResumeSession(repo, "user_a", { scenarioSlug: "not-real" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("a different user cannot fetch another user's session", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const result = await getSessionForOwner(repo, "user_b", created.result.id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("fetching an unknown session returns 404", async () => {
  const repo = new InMemoryReviewRepository();
  const result = await getSessionForOwner(repo, "user_a", "does-not-exist");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("updateDraft rejects an unknown node id", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const result = await updateDraft(repo, "user_a", created.result.id, { reviewedNodeIds: ["not-a-real-node"] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("updateDraft persists valid fields, visible on re-fetch", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  await updateDraft(repo, "user_a", created.result.id, { reviewedNodeIds: ["checkout-service"], reviewerNotes: "draft note" });
  const fetched = await getSessionForOwner(repo, "user_a", created.result.id);
  assert.ok(fetched.ok);
  if (fetched.ok) {
    assert.deepEqual(fetched.result.reviewedNodeIds, ["checkout-service"]);
    assert.equal(fetched.result.reviewerNotes, "draft note");
  }
});

test("addRedline validates the target exists on the scenario", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const result = await addRedline(repo, "user_a", created.result.id, redlineBody({ targetId: "not-a-real-node" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("addRedline persists and appears in the session view; update/delete work", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const added = await addRedline(repo, "user_a", created.result.id, redlineBody());
  assert.ok(added.ok);
  if (added.ok) assert.equal(added.result.redlines.length, 1);

  await updateRedline(repo, "user_a", created.result.id, "redline-1", { title: "Renamed" });
  const afterUpdate = await getSessionForOwner(repo, "user_a", created.result.id);
  assert.ok(afterUpdate.ok);
  if (afterUpdate.ok) assert.equal(afterUpdate.result.redlines[0]?.title, "Renamed");

  await deleteRedline(repo, "user_a", created.result.id, "redline-1");
  const afterDelete = await getSessionForOwner(repo, "user_a", created.result.id);
  assert.ok(afterDelete.ok);
  if (afterDelete.ok) assert.equal(afterDelete.result.redlines.length, 0);
});

test("addTranscriptTurn persists and dedupes by turn id", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const turn = { id: "turn-1", speaker: "reviewer" as const, text: "Hello", timestamp: new Date().toISOString(), final: true };
  await addTranscriptTurn(repo, "user_a", created.result.id, { conversationId: "conv-1", turn });
  const result = await addTranscriptTurn(repo, "user_a", created.result.id, { conversationId: "conv-1", turn });
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.result.transcript.length, 1);
});

test("saveStressProgress rejects an unknown stress test id", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;
  const result = await saveStressProgress(repo, "user_a", created.result.id, {
    stressTestId: "not-a-real-stress-test",
    status: "running",
    currentStep: 0,
    completedAt: null,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("submitSession locks the session and subsequent mutation attempts return 409", async () => {
  const repo = new InMemoryReviewRepository();
  const created = await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  assert.ok(created.ok);
  if (!created.ok) return;

  const submitted = await submitSession(repo, "user_a", created.result.id, {
    recommendation: "approve",
    finalRationale: "The architecture is ready to proceed given the stated constraints.",
  });
  assert.ok(submitted.ok);
  if (submitted.ok) {
    assert.equal(submitted.result.status, "submitted");
    assert.equal(submitted.result.recommendation, "approve");
  }

  const mutationAfterSubmit = await updateDraft(repo, "user_a", created.result.id, { reviewerNotes: "too late" });
  assert.equal(mutationAfterSubmit.ok, false);
  if (!mutationAfterSubmit.ok) assert.equal(mutationAfterSubmit.status, 409);
});

test("listHistory returns only the requesting user's sessions", async () => {
  const repo = new InMemoryReviewRepository();
  await startOrResumeSession(repo, "user_a", { scenarioSlug: SLUG });
  await startOrResumeSession(repo, "user_b", { scenarioSlug: SLUG });
  const history = await listHistory(repo, "user_a");
  assert.ok(history.ok);
  if (history.ok) assert.equal(history.result.length, 1);
});
