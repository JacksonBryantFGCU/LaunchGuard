import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryLeaderboardRepository } from "./leaderboardRepository.js";

const USER_A = "user_a";
const USER_B = "user_b";
const SCENARIO_1 = "checkout-latency-spike";
const SCENARIO_2 = "payment-provider-degradation";

test("recordBestScore stores the first score for a user+scenario", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-1",
    objectiveScore: 8,
    objectiveMaxScore: 16,
    normalizedScore: 50,
  });
  await repo.upsertProfile(USER_A, { displayName: "A", optedIn: true });
  const board = await repo.listScenarioLeaderboard(SCENARIO_1);
  assert.equal(board.length, 1);
  assert.equal(board[0]?.normalizedScore, 50);
});

test("recordBestScore keeps the higher score when a later attempt scores lower", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await repo.upsertProfile(USER_A, { optedIn: true });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-1",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-2",
    objectiveScore: 4,
    objectiveMaxScore: 16,
    normalizedScore: 25,
  });
  const board = await repo.listScenarioLeaderboard(SCENARIO_1);
  assert.equal(board[0]?.normalizedScore, 75);
});

test("recordBestScore replaces the score when a later attempt scores higher", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await repo.upsertProfile(USER_A, { optedIn: true });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-1",
    objectiveScore: 4,
    objectiveMaxScore: 16,
    normalizedScore: 25,
  });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-2",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });
  const board = await repo.listScenarioLeaderboard(SCENARIO_1);
  assert.equal(board[0]?.normalizedScore, 75);
});

test("non-opted-in users are absent from scenario and overall reads; opting out removes them again", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "attempt-1",
    objectiveScore: 8,
    objectiveMaxScore: 16,
    normalizedScore: 50,
  });
  assert.equal((await repo.listScenarioLeaderboard(SCENARIO_1)).length, 0);
  assert.equal((await repo.listOverallLeaderboard()).length, 0);

  await repo.upsertProfile(USER_A, { displayName: "A", optedIn: true });
  assert.equal((await repo.listScenarioLeaderboard(SCENARIO_1)).length, 1);
  assert.equal((await repo.listOverallLeaderboard()).length, 1);

  await repo.upsertProfile(USER_A, { optedIn: false });
  assert.equal((await repo.listScenarioLeaderboard(SCENARIO_1)).length, 0);
  assert.equal((await repo.listOverallLeaderboard()).length, 0);
});

test("listOverallLeaderboard includes one entry per completed scenario per opted-in user", async () => {
  const repo = new InMemoryLeaderboardRepository();
  await repo.upsertProfile(USER_A, { optedIn: true });
  await repo.upsertProfile(USER_B, { optedIn: true });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_1,
    attemptId: "a1",
    objectiveScore: 8,
    objectiveMaxScore: 16,
    normalizedScore: 50,
  });
  await repo.recordBestScore({
    userId: USER_A,
    practiceScenarioId: SCENARIO_2,
    attemptId: "a2",
    objectiveScore: 16,
    objectiveMaxScore: 16,
    normalizedScore: 100,
  });
  await repo.recordBestScore({
    userId: USER_B,
    practiceScenarioId: SCENARIO_1,
    attemptId: "b1",
    objectiveScore: 16,
    objectiveMaxScore: 16,
    normalizedScore: 100,
  });
  const overall = await repo.listOverallLeaderboard();
  assert.equal(overall.length, 3);
});
