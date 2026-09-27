import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryReviewRepository } from "./reviewRepository.js";
import { InMemoryPracticeScenarioRepository } from "./practiceScenarioRepository.js";
import { startOrResumeSession, submitSession } from "./reviewSessionService.js";
import {
  getOrStartPracticeScenarioAttempt,
  savePracticeResponseDraft,
  submitPracticeScenarioResponse,
} from "./practiceScenarioService.js";
import { getStressTestsForReview } from "./stressTestService.js";

async function submittedSessionId(repo: InMemoryReviewRepository, userId = "user_owner"): Promise<string> {
  const created = await startOrResumeSession(repo, userId, { scenarioSlug: "black-friday-checkout" });
  assert.ok(created.ok);
  if (!created.ok) throw new Error("setup failed");
  const submitted = await submitSession(repo, userId, created.result.id, {
    recommendation: "approve",
    finalRationale: "The architecture appears ready to proceed given the stated constraints.",
  });
  assert.ok(submitted.ok);
  return created.result.id;
}

test("returns stress tests for a submitted review to its owner", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const reviewId = await submittedSessionId(repo);
  const result = await getStressTestsForReview(repo, practiceRepo, reviewId, "user_owner");
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.result.reviewId, reviewId);
    assert.equal(result.result.scenarioSlug, "black-friday-checkout");
    assert.equal(result.result.tests.length, 6);
  }
});

test("returns 403 for a different authenticated user", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const reviewId = await submittedSessionId(repo);
  const result = await getStressTestsForReview(repo, practiceRepo, reviewId, "user_someone_else");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.error, "forbidden");
  }
});

test("returns 404 for an unknown review id", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const result = await getStressTestsForReview(repo, practiceRepo, "not-a-real-review-id", "user_owner");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("returns 404 for a review that is still a draft with no submitted practice attempt either", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const created = await startOrResumeSession(repo, "user_owner", { scenarioSlug: "black-friday-checkout" });
  assert.ok(created.ok);
  if (!created.ok) return;
  const result = await getStressTestsForReview(repo, practiceRepo, created.result.id, "user_owner");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("returns stress tests once any practice scenario attempt on the review has been submitted", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const created = await startOrResumeSession(repo, "user_owner", { scenarioSlug: "black-friday-checkout" });
  assert.ok(created.ok);
  if (!created.ok) return;

  await getOrStartPracticeScenarioAttempt(repo, practiceRepo, "user_owner", created.result.id, "checkout-latency-spike");
  await savePracticeResponseDraft(repo, practiceRepo, "user_owner", created.result.id, "checkout-latency-spike", {
    diagnosis: "Database contention",
    investigationPlan: "Check connections",
    immediateAction: "Add pooling",
    architectureDecision: "Add a pooler",
    tradeoff: "More complexity",
    severity: "medium",
  });
  const submitted = await submitPracticeScenarioResponse(repo, practiceRepo, "user_owner", created.result.id, "checkout-latency-spike");
  assert.ok(submitted.ok);

  const result = await getStressTestsForReview(repo, practiceRepo, created.result.id, "user_owner");
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.result.reviewId, created.result.id);
});

test("stress-test reveal never carries private hidden-risk mapping", async () => {
  const repo = new InMemoryReviewRepository();
  const practiceRepo = new InMemoryPracticeScenarioRepository();
  const reviewId = await submittedSessionId(repo);
  const result = await getStressTestsForReview(repo, practiceRepo, reviewId, "user_owner");
  assert.ok(result.ok);
  if (result.ok) {
    const serialized = JSON.stringify(result.result);
    assert.ok(!serialized.includes("revealsRiskIds"));
    assert.ok(!serialized.includes("expectedReviewerInsight"));
    assert.ok(!serialized.includes("matchingConcepts"));
    assert.ok(!serialized.includes("evaluationRubric"));
    assert.ok(!serialized.includes("risk-payment-idempotency"));
  }
});
