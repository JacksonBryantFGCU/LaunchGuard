import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialStressTestSimulatorState,
  stressTestSimulatorReducer,
} from "./stressTestState.js";

test("selecting a test sets it as selected and resets step/playback", () => {
  const state = createInitialStressTestSimulatorState();
  const next = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  assert.equal(next.selectedTestId, "stress-10x-spike");
  assert.equal(next.currentStepIndex, 0);
  assert.equal(next.isPlaying, false);
});

test("starting a test marks it running and begins playback at step 0", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  assert.equal(state.isPlaying, true);
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.testStatuses["stress-10x-spike"], "running");
});

test("starting a test with none selected is a no-op", () => {
  const state = createInitialStressTestSimulatorState();
  const next = stressTestSimulatorReducer(state, { type: "START_TEST" });
  assert.equal(next, state);
});

test("advancing a step moves to the next step while more remain", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "ADVANCE_STEP", stepCount: 4, finalStatus: "fail" });
  assert.equal(state.currentStepIndex, 1);
  assert.equal(state.isPlaying, true);
});

test("advancing past the last step finishes the test and stops playback", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  for (let i = 0; i < 4; i++) {
    state = stressTestSimulatorReducer(state, { type: "ADVANCE_STEP", stepCount: 4, finalStatus: "fail" });
  }
  assert.equal(state.isPlaying, false);
  assert.equal(state.testStatuses["stress-10x-spike"], "failed");
  assert.deepEqual(state.completedTestIds, ["stress-10x-spike"]);
});

test("advancing while paused is a no-op", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "PAUSE" });
  const next = stressTestSimulatorReducer(state, { type: "ADVANCE_STEP", stepCount: 4, finalStatus: "fail" });
  assert.equal(next, state);
});

test("pause stops playback without losing step position", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "ADVANCE_STEP", stepCount: 4, finalStatus: "fail" });
  state = stressTestSimulatorReducer(state, { type: "PAUSE" });
  assert.equal(state.isPlaying, false);
  assert.equal(state.currentStepIndex, 1);
});

test("resume continues playback from the current step", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "PAUSE" });
  state = stressTestSimulatorReducer(state, { type: "RESUME" });
  assert.equal(state.isPlaying, true);
});

test("restart resets step index and status for the selected test", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "ADVANCE_STEP", stepCount: 4, finalStatus: "fail" });
  state = stressTestSimulatorReducer(state, { type: "RESTART_TEST" });
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.isPlaying, false);
  assert.equal(state.testStatuses["stress-10x-spike"], "not_started");
});

test("finishing directly marks completion and stops playback", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-normal-traffic" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "FINISH_TEST", finalStatus: "pass" });
  assert.equal(state.testStatuses["stress-normal-traffic"], "passed");
  assert.equal(state.isPlaying, false);
  assert.deepEqual(state.completedTestIds, ["stress-normal-traffic"]);
});

test("switching to another test does not lose the first test's completion", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-normal-traffic" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "FINISH_TEST", finalStatus: "pass" });
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-10x-spike" });
  assert.equal(state.selectedTestId, "stress-10x-spike");
  assert.equal(state.testStatuses["stress-normal-traffic"], "passed");
  assert.deepEqual(state.completedTestIds, ["stress-normal-traffic"]);
});

test("completing the same test twice does not duplicate it in completedTestIds", () => {
  let state = createInitialStressTestSimulatorState();
  state = stressTestSimulatorReducer(state, { type: "SELECT_TEST", testId: "stress-normal-traffic" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "FINISH_TEST", finalStatus: "pass" });
  state = stressTestSimulatorReducer(state, { type: "RESTART_TEST" });
  state = stressTestSimulatorReducer(state, { type: "START_TEST" });
  state = stressTestSimulatorReducer(state, { type: "FINISH_TEST", finalStatus: "pass" });
  assert.deepEqual(state.completedTestIds, ["stress-normal-traffic"]);
});

test("hydrating persisted progress restores completed test statuses", () => {
  const state = createInitialStressTestSimulatorState();
  const next = stressTestSimulatorReducer(state, {
    type: "HYDRATE_PROGRESS",
    completed: [
      { stressTestId: "stress-normal-traffic", status: "passed" },
      { stressTestId: "stress-10x-spike", status: "failed" },
    ],
  });
  assert.equal(next.testStatuses["stress-normal-traffic"], "passed");
  assert.equal(next.testStatuses["stress-10x-spike"], "failed");
  assert.deepEqual(next.completedTestIds, ["stress-normal-traffic", "stress-10x-spike"]);
});
