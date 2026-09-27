import { test } from "node:test";
import assert from "node:assert/strict";
import type { PracticeScenario, PracticeScenarioAttemptSummary } from "@redline/shared";
import { deriveScenarioListStatus } from "./practiceProgression.js";

function scenario(order: number, id: string): PracticeScenario {
  return {
    id,
    order,
    title: `Scenario ${order}`,
    shortDescription: "d",
    situation: "s",
    objective: "o",
    requirementIds: [],
    investigationPrompts: ["p"],
    availableResourceTypes: ["architecture"],
  };
}

function summary(id: string, status: PracticeScenarioAttemptSummary["status"]): PracticeScenarioAttemptSummary {
  return {
    practiceScenarioId: id,
    status,
    startedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    completedAt: null,
    objectiveScore: null,
    maxObjectiveScore: null,
  };
}

const scenarios = [scenario(1, "s1"), scenario(2, "s2"), scenario(3, "s3")];

test("the first scenario is available when nothing has started", () => {
  const result = deriveScenarioListStatus(scenarios, []);
  assert.equal(result[0]?.displayStatus, "available");
  assert.equal(result[1]?.displayStatus, "locked");
  assert.equal(result[2]?.displayStatus, "locked");
});

test("a started, unsubmitted scenario shows in_progress", () => {
  const result = deriveScenarioListStatus(scenarios, [summary("s1", "investigating")]);
  assert.equal(result[0]?.displayStatus, "in_progress");
  assert.equal(result[1]?.displayStatus, "locked");
});

test("completing scenario 1 unlocks scenario 2", () => {
  const result = deriveScenarioListStatus(scenarios, [summary("s1", "completed")]);
  assert.equal(result[0]?.displayStatus, "completed");
  assert.equal(result[1]?.displayStatus, "available");
  assert.equal(result[2]?.displayStatus, "locked");
});

test("a submitted-but-not-completed scenario still shows in_progress, not completed", () => {
  const result = deriveScenarioListStatus(scenarios, [summary("s1", "feedback_ready")]);
  assert.equal(result[0]?.displayStatus, "in_progress");
  assert.equal(result[1]?.displayStatus, "locked");
});

test("progress count reflects only completed scenarios", () => {
  const result = deriveScenarioListStatus(scenarios, [summary("s1", "completed"), summary("s2", "completed")]);
  const completedCount = result.filter((r) => r.displayStatus === "completed").length;
  assert.equal(completedCount, 2);
  assert.equal(result[2]?.displayStatus, "available");
});
