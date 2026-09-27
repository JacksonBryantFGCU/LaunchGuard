import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransitionPracticeScenarioStatus } from "./practiceScenarioStateMachine.js";

test("allows the forward happy path", () => {
  assert.equal(canTransitionPracticeScenarioStatus("investigating", "submitted"), true);
  assert.equal(canTransitionPracticeScenarioStatus("submitted", "feedback_ready"), true);
  assert.equal(canTransitionPracticeScenarioStatus("feedback_ready", "consequence_ready"), true);
  assert.equal(canTransitionPracticeScenarioStatus("consequence_ready", "completed"), true);
});

test("rejects skipping a step", () => {
  assert.equal(canTransitionPracticeScenarioStatus("investigating", "feedback_ready"), false);
  assert.equal(canTransitionPracticeScenarioStatus("submitted", "completed"), false);
});

test("rejects backward transitions", () => {
  assert.equal(canTransitionPracticeScenarioStatus("submitted", "investigating"), false);
  assert.equal(canTransitionPracticeScenarioStatus("completed", "consequence_ready"), false);
});

test("rejects staying in place", () => {
  assert.equal(canTransitionPracticeScenarioStatus("investigating", "investigating"), false);
});

test("rejects any transition out of completed", () => {
  assert.equal(canTransitionPracticeScenarioStatus("completed", "submitted"), false);
});
