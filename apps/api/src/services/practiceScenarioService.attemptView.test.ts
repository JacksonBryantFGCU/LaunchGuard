import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryReviewRepository } from "./reviewRepository.js";
import { InMemoryPracticeScenarioRepository } from "./practiceScenarioRepository.js";
import { InMemoryLeaderboardRepository } from "./leaderboardRepository.js";
import { startOrResumeSession, addTranscriptTurn } from "./reviewSessionService.js";
import {
  getOrStartPracticeScenarioAttempt,
  getPracticeScenarioAttemptView,
  listPracticeScenarioAttemptSummaries,
  savePracticeResponseDraft,
  setPracticeRequirements,
  addPracticeEvidence,
  removePracticeEvidence,
  setPracticeResponseEvidence,
  submitPracticeScenarioResponse,
  markPracticeScenarioConsequenceReady,
  completePracticeScenarioAttempt,
} from "./practiceScenarioService.js";

const SLUG = "black-friday-checkout";
const SCENARIO_ID = "checkout-latency-spike";

async function setup() {
  const reviewRepo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const started = await startOrResumeSession(reviewRepo, "user_a", { scenarioSlug: SLUG });
  if (!started.ok) throw new Error("setup failed");
  const sessionId = started.result.id;
  await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  return { reviewRepo, practiceRepo, sessionId };
}

test("getPracticeScenarioAttemptView returns a fresh empty draft", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const result = await getPracticeScenarioAttemptView(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.result.status, "investigating");
  assert.equal(result.result.response.diagnosis, "");
  assert.deepEqual(result.result.affectedRequirementIds, []);
  assert.equal(result.result.result, null);
});

test("a different user cannot view another user's attempt", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const result = await getPracticeScenarioAttemptView(reviewRepo, practiceRepo, "user_b", sessionId, SCENARIO_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("listPracticeScenarioAttemptSummaries reports null score before evaluation, real score after", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();

  const before = await listPracticeScenarioAttemptSummaries(reviewRepo, practiceRepo, "user_a", sessionId);
  assert.ok(before.ok);
  if (before.ok) {
    assert.equal(before.result.length, 1);
    assert.equal(before.result[0]?.objectiveScore, null);
  }

  await savePracticeResponseDraft(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    diagnosis: "Database contention",
    investigationPlan: "Check connections",
    immediateAction: "Add pooling",
    architectureDecision: "Add a pooler",
    tradeoff: "More complexity",
    severity: "medium",
  });
  await submitPracticeScenarioResponse(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);

  const after = await listPracticeScenarioAttemptSummaries(reviewRepo, practiceRepo, "user_a", sessionId);
  assert.ok(after.ok);
  if (after.ok) {
    assert.equal(after.result[0]?.status, "feedback_ready");
    assert.ok(typeof after.result[0]?.objectiveScore === "number");
  }
});

test("savePracticeResponseDraft persists fields visible on the next view", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const saved = await savePracticeResponseDraft(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    diagnosis: "Contention",
  });
  assert.ok(saved.ok);
  if (saved.ok) assert.equal(saved.result.response.diagnosis, "Contention");
});

test("setPracticeRequirements replaces the selection", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  await setPracticeRequirements(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, ["req-latency"]);
  const result = await setPracticeRequirements(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, ["req-throughput"]);
  assert.ok(result.ok);
  if (result.ok) assert.deepEqual(result.result.affectedRequirementIds, ["req-throughput"]);
});

test("evidence round-trips through add/list/remove", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const added = await addPracticeEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    sourceType: "scenario_evidence",
    sourceId: "ev-db-connections",
    label: "Max connections",
    content: "500",
  });
  assert.ok(added.ok);
  if (!added.ok) return;
  assert.equal(added.result.evidence.length, 1);
  const evidenceId = added.result.evidence[0]!.id;

  const removed = await removePracticeEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, evidenceId);
  assert.ok(removed.ok);
  if (removed.ok) assert.equal(removed.result.evidence.length, 0);
});

test("architect_statement evidence must reference a real transcript turn on this review session", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const rejected = await addPracticeEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    sourceType: "architect_statement",
    sourceId: null,
    label: "Alex on retries",
    content: "We retry three times.",
    transcriptTurnId: "does-not-exist",
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.status, 400);

  await addTranscriptTurn(reviewRepo, "user_a", sessionId, {
    conversationId: "conv-1",
    turn: { id: "turn-1", speaker: "architect", text: "We retry three times.", timestamp: new Date().toISOString(), final: true },
  });
  const accepted = await addPracticeEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    sourceType: "architect_statement",
    sourceId: null,
    label: "Alex on retries",
    content: "We retry three times.",
    transcriptTurnId: "turn-1",
  });
  assert.ok(accepted.ok);
});

test("setPracticeResponseEvidence selects and replaces linked evidence", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const added = await addPracticeEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    sourceType: "scenario_evidence",
    sourceId: "ev-db-connections",
    label: "l",
    content: "c",
  });
  assert.ok(added.ok);
  if (!added.ok) return;
  const evidenceId = added.result.evidence[0]!.id;

  const result = await setPracticeResponseEvidence(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, [evidenceId]);
  assert.ok(result.ok);
  if (result.ok) assert.deepEqual(result.result.selectedEvidenceIds, [evidenceId]);
});

test("consequence-ready and completion progress after a submitted+evaluated attempt", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  await savePracticeResponseDraft(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID, {
    diagnosis: "Contention",
    investigationPlan: "Check connections",
    immediateAction: "Add pooling",
    architectureDecision: "Add a pooler",
    tradeoff: "More complexity",
    severity: "medium",
  });
  await submitPracticeScenarioResponse(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);

  const consequenceReady = await markPracticeScenarioConsequenceReady(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(consequenceReady.ok);
  if (consequenceReady.ok) assert.equal(consequenceReady.result.status, "consequence_ready");

  const completed = await completePracticeScenarioAttempt(
    reviewRepo,
    practiceRepo,
    new InMemoryLeaderboardRepository(),
    "user_a",
    sessionId,
    SCENARIO_ID,
  );
  assert.ok(completed.ok);
  if (completed.ok) assert.equal(completed.result.status, "completed");
});
