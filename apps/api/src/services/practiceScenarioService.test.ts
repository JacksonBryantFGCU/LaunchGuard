import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryReviewRepository } from "./reviewRepository.js";
import { InMemoryPracticeScenarioRepository } from "./practiceScenarioRepository.js";
import { startOrResumeSession } from "./reviewSessionService.js";
import { getOrStartPracticeScenarioAttempt, submitPracticeScenarioResponse } from "./practiceScenarioService.js";

const SLUG = "black-friday-checkout";
const SCENARIO_ID = "checkout-latency-spike";

async function setup() {
  const reviewRepo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const started = await startOrResumeSession(reviewRepo, "user_a", { scenarioSlug: SLUG });
  if (!started.ok) throw new Error("setup failed");
  return { reviewRepo, practiceRepo, sessionId: started.result.id };
}

// --- ownership (spec section 17) ---------------------------------------

test("starting a practice attempt stores the verified owner's session, not a client-supplied one", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const result = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.result.reviewSessionId, sessionId);
});

test("a different user cannot start or access an attempt under another user's review session", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const result = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_b", sessionId, SCENARIO_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("an unknown review session id fails with not found, not a repository error", async () => {
  const { reviewRepo, practiceRepo } = await setup();
  const result = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", "does-not-exist", SCENARIO_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("an unknown practice scenario id is rejected", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const result = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, "not-a-real-scenario");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("starting the same scenario twice resumes the same attempt", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const first = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  const second = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(first.ok && second.ok);
  if (first.ok && second.ok) assert.equal(first.result.id, second.result.id);
});

// --- submission validation (spec section 22) ----------------------------

test("submitting an incomplete response is rejected by the service, not silently accepted", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);

  const result = await submitPracticeScenarioResponse(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);

  const attempt = await practiceRepo.getPracticeScenarioAttempt(sessionId, SCENARIO_ID);
  assert.equal(attempt?.status, "investigating");
});

test("submitting a complete response succeeds and produces a deterministic result", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  const started = await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(started.ok);
  if (!started.ok) return;

  await practiceRepo.savePracticeScenarioResponseDraft(started.result.id, {
    diagnosis: "Checkout and Inventory both scale out against one Postgres connection limit.",
    investigationPlan: "Compare connection counts against the configured limit.",
    immediateAction: "Add a connection pooler in front of Postgres.",
    architectureDecision: "Introduce a read replica and pooling layer.",
    tradeoff: "Adds an operational component to run and monitor.",
    severity: "high",
  });

  const result = await submitPracticeScenarioResponse(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  assert.ok(result.ok);
  if (!result.ok) return;

  assert.equal(result.result.attempt.status, "feedback_ready");
  assert.ok(result.result.evaluation.objectiveScore > 0);

  const stored = await practiceRepo.getPracticeScenarioResult(started.result.id);
  assert.equal(stored?.objectiveScore, result.result.evaluation.objectiveScore);
});

test("a different user cannot submit another user's attempt", async () => {
  const { reviewRepo, practiceRepo, sessionId } = await setup();
  await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, "user_a", sessionId, SCENARIO_ID);
  const result = await submitPracticeScenarioResponse(reviewRepo, practiceRepo, "user_b", sessionId, SCENARIO_ID);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});
