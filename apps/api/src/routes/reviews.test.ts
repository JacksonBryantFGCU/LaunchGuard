import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";
import { InMemoryReviewRepository } from "../services/reviewRepository.js";

async function createAndSubmitSession(baseUrl: string): Promise<string> {
  const createRes = await fetch(`${baseUrl}/api/review-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
  });
  const { id } = (await createRes.json()) as { id: string };

  const submitRes = await fetch(`${baseUrl}/api/review-sessions/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recommendation: "approve",
      finalRationale: "The architecture appears ready to proceed given the stated constraints.",
    }),
  });
  assert.equal(submitRes.status, 200);
  return id;
}

test("GET /api/reviews returns only the authenticated user's history", async () => {
  const repository = new InMemoryReviewRepository();
  await withTestServer(
    async (baseUrl) => {
      await createAndSubmitSession(baseUrl);
    },
    { userId: "user_a", repository },
  );
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reviews`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, unknown>[];
      assert.equal(body.length, 0);
    },
    { userId: "user_b", repository },
  );
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reviews`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, unknown>[];
      assert.equal(body.length, 1);
      assert.equal(body[0]?.scenarioSlug, "black-friday-checkout");
      assert.equal(body[0]?.status, "submitted");
    },
    { userId: "user_a", repository },
  );
});

test("GET /api/reviews rejects an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reviews`);
      assert.equal(res.status, 401);
    },
    { userId: null },
  );
});

test("GET /api/reviews/:reviewId/stress-tests returns tests for a submitted review", async () => {
  await withTestServer(async (baseUrl) => {
    const reviewId = await createAndSubmitSession(baseUrl);
    const res = await fetch(`${baseUrl}/api/reviews/${reviewId}/stress-tests`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.reviewId, reviewId);
    assert.equal(body.scenarioSlug, "black-friday-checkout");
    assert.equal(Array.isArray(body.tests) && body.tests.length, 6);
  });
});

test("GET /api/reviews/:reviewId/stress-tests returns 404 for an unknown review id", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/reviews/not-a-real-review-id/stress-tests`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "review_not_found");
  });
});

test("GET /api/reviews/:reviewId/stress-tests rejects an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reviews/any-id/stress-tests`);
      assert.equal(res.status, 401);
    },
    { userId: null },
  );
});

test("GET /api/reviews/:reviewId/stress-tests response never leaks private answer-key data", async () => {
  await withTestServer(async (baseUrl) => {
    const reviewId = await createAndSubmitSession(baseUrl);
    const res = await fetch(`${baseUrl}/api/reviews/${reviewId}/stress-tests`);
    const bodyText = await res.text();
    assert.ok(!bodyText.includes("revealsRiskIds"));
    assert.ok(!bodyText.includes("expectedReviewerInsight"));
    assert.ok(!bodyText.includes("matchingConcepts"));
    assert.ok(!bodyText.includes("evaluationRubric"));
    assert.ok(!bodyText.includes("risk-payment-idempotency"));
  });
});
