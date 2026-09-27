import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";
import { InMemoryReviewRepository } from "../services/reviewRepository.js";
import { InMemoryPracticeScenarioRepository } from "../services/practiceScenarioRepository.js";
import { InMemoryLeaderboardRepository } from "../services/leaderboardRepository.js";

const SCENARIO_ID = "checkout-latency-spike";

async function createReviewSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/review-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function runFullAttempt(baseUrl: string, sessionId: string): Promise<void> {
  await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/start`, { method: "POST" });
  await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/response`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagnosis: "Database contention",
      investigationPlan: "Check connections",
      immediateAction: "Add pooling",
      architectureDecision: "Add a pooler",
      tradeoff: "More complexity",
      severity: "medium",
    }),
  });
  await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/submit`, { method: "POST" });
  await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/consequence-ready`, {
    method: "POST",
  });
}

test("leaderboard routes reject an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const overall = await fetch(`${baseUrl}/api/leaderboard/overall`);
      assert.equal(overall.status, 401);
      const scenario = await fetch(`${baseUrl}/api/leaderboard/scenarios/${SCENARIO_ID}`);
      assert.equal(scenario.status, 401);
      const profile = await fetch(`${baseUrl}/api/leaderboard/profile`);
      assert.equal(profile.status, 401);
      const patch = await fetch(`${baseUrl}/api/leaderboard/profile`, { method: "PATCH" });
      assert.equal(patch.status, 401);
    },
    { userId: null },
  );
});

test("GET /api/leaderboard/profile lazily creates a non-opted-in profile", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/leaderboard/profile`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { optedIn: boolean; displayName: string };
    assert.equal(body.optedIn, false);
  });
});

test("PATCH /api/leaderboard/profile with a displayName opts the user in and never accepts a client-supplied score", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/leaderboard/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Alice", score: 9999, rank: 1 }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { optedIn: boolean; displayName: string };
    assert.equal(body.optedIn, true);
    assert.equal(body.displayName, "Alice");
    assert.ok(!("score" in body));
    assert.ok(!("rank" in body));
  });
});

test("an attempt that only reaches feedback_ready (submitted, not completed) never produces a leaderboard entry", async () => {
  const repository = new InMemoryReviewRepository();
  const practiceRepository = new InMemoryPracticeScenarioRepository();
  const leaderboardRepository = new InMemoryLeaderboardRepository();

  await withTestServer(
    async (baseUrl) => {
      const sessionId = await createReviewSession(baseUrl);
      await fetch(`${baseUrl}/api/leaderboard/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Alice" }),
      });

      await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/start`, { method: "POST" });
      await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: "Database contention",
          investigationPlan: "Check connections",
          immediateAction: "Add pooling",
          architectureDecision: "Add a pooler",
          tradeoff: "More complexity",
          severity: "medium",
        }),
      });
      await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/submit`, { method: "POST" });

      const board = await fetch(`${baseUrl}/api/leaderboard/scenarios/${SCENARIO_ID}`);
      const boardBody = (await board.json()) as unknown[];
      assert.equal(boardBody.length, 0);
    },
    { repository, practiceRepository, leaderboardRepository },
  );
});

test("completing an attempt produces a leaderboard entry visible once opted in", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createReviewSession(baseUrl);
    await fetch(`${baseUrl}/api/leaderboard/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Alice" }),
    });

    await runFullAttempt(baseUrl, sessionId);
    await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/complete`, { method: "POST" });

    const board = await fetch(`${baseUrl}/api/leaderboard/scenarios/${SCENARIO_ID}`);
    assert.equal(board.status, 200);
    const boardBody = (await board.json()) as { displayName: string; isCurrentUser: boolean }[];
    assert.equal(boardBody.length, 1);
    assert.equal(boardBody[0]?.displayName, "Alice");
    assert.equal(boardBody[0]?.isCurrentUser, true);
  });
});
