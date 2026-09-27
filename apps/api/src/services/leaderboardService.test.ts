import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryLeaderboardRepository } from "./leaderboardRepository.js";
import {
  normalizeScore,
  recordScenarioCompletion,
  getScenarioLeaderboard,
  getOverallLeaderboard,
  getProfile,
  updateProfile,
} from "./leaderboardService.js";

const SCENARIO_1 = "checkout-latency-spike";
const SCENARIO_2 = "payment-provider-degradation";
const SCENARIO_3 = "duplicate-checkout-requests";

test("normalizeScore is deterministic for the same score/max", () => {
  assert.equal(normalizeScore(8, 16), 50);
  assert.equal(normalizeScore(8, 16), normalizeScore(8, 16));
  assert.equal(normalizeScore(16, 16), 100);
  assert.equal(normalizeScore(0, 16), 0);
});

async function optIn(repo: InMemoryLeaderboardRepository, userId: string, displayName: string) {
  await updateProfile(repo, userId, { displayName });
}

test("getScenarioLeaderboard rejects an unknown scenario id", async () => {
  const repo = new InMemoryLeaderboardRepository();
  const result = await getScenarioLeaderboard(repo, "user_a", "not-a-real-scenario");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("tie handling: equal scores share a rank, next distinct score skips (1,1,3)", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await optIn(repo, "user_a", "Alice");
  await optIn(repo, "user_b", "Bob");
  await optIn(repo, "user_c", "Cara");

  await recordScenarioCompletion(repo, "user_a", SCENARIO_1, "att-a", 12, 16); // 75
  await recordScenarioCompletion(repo, "user_b", SCENARIO_1, "att-b", 12, 16); // 75 (tie)
  await recordScenarioCompletion(repo, "user_c", SCENARIO_1, "att-c", 8, 16); // 50

  const result = await getScenarioLeaderboard(repo, "user_a", SCENARIO_1);
  assert.ok(result.ok);
  if (!result.ok) return;
  const ranks = result.result.map((r) => r.rank);
  assert.deepEqual(ranks, [1, 1, 3]);
});

test("overall aggregation: below the minimum completed scenarios is excluded, at/above is included with correct average", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await optIn(repo, "under_threshold", "Under");
  await optIn(repo, "meets_threshold", "Meets");

  await recordScenarioCompletion(repo, "under_threshold", SCENARIO_1, "u1", 16, 16); // 100, only 1 scenario

  await recordScenarioCompletion(repo, "meets_threshold", SCENARIO_1, "m1", 8, 16); // 50
  await recordScenarioCompletion(repo, "meets_threshold", SCENARIO_2, "m2", 12, 16); // 75

  const result = await getOverallLeaderboard(repo, "meets_threshold");
  assert.ok(result.ok);
  if (!result.ok) return;

  const userIds = result.result.map((r) => r.displayName);
  assert.ok(!userIds.includes("Under"));
  const meets = result.result.find((r) => r.displayName === "Meets");
  assert.ok(meets);
  assert.equal(meets?.score, 63); // round((50+75)/2)
  assert.equal(meets?.scenariosCompleted, 2);
});

test("overall aggregation includes a third scenario correctly for users who complete more than the minimum", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await optIn(repo, "user_a", "Alice");
  await recordScenarioCompletion(repo, "user_a", SCENARIO_1, "a1", 16, 16);
  await recordScenarioCompletion(repo, "user_a", SCENARIO_2, "a2", 16, 16);
  await recordScenarioCompletion(repo, "user_a", SCENARIO_3, "a3", 8, 16);

  const result = await getOverallLeaderboard(repo, "user_a");
  assert.ok(result.ok);
  if (!result.ok) return;
  const alice = result.result.find((r) => r.displayName === "Alice");
  assert.equal(alice?.scenariosCompleted, 3);
});

test("display name validation rejects empty/whitespace and control characters, accepts and trims a normal name", async () => {
  const repo = new InMemoryLeaderboardRepository();

  const empty = await updateProfile(repo, "user_a", { displayName: "   " });
  assert.equal(empty.ok, false);

  const control = await updateProfile(repo, "user_a", { displayName: "Bad\x07Name" });
  assert.equal(control.ok, false);

  const ok = await updateProfile(repo, "user_a", { displayName: "  Alice  " });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.result.displayName, "Alice");
    assert.equal(ok.result.optedIn, true);
  }
});

test("no leaderboard row or profile response contains an email field or a raw userId string", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await optIn(repo, "user_a@example.com-lookalike", "Alice");
  await recordScenarioCompletion(repo, "user_a@example.com-lookalike", SCENARIO_1, "att", 16, 16);

  const scenarioResult = await getScenarioLeaderboard(repo, "someone_else", SCENARIO_1);
  assert.ok(scenarioResult.ok);
  if (scenarioResult.ok) {
    for (const row of scenarioResult.result) {
      assert.ok(!("email" in row));
      assert.ok(!("userId" in row));
    }
  }

  const profileResult = await getProfile(repo, "someone_else");
  assert.ok(profileResult.ok);
  if (profileResult.ok) {
    assert.ok(!("email" in profileResult.result));
    assert.ok(!("userId" in profileResult.result));
  }
});
