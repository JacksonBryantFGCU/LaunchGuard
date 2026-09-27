import { test } from "node:test";
import assert from "node:assert/strict";
import { initialPlaybackState, play, pause, next, previous, restart, jumpTo, tick } from "./playback.js";

test("initial state starts paused at frame 0", () => {
  const s = initialPlaybackState(5);
  assert.equal(s.status, "paused");
  assert.equal(s.currentFrameIndex, 0);
  assert.equal(s.frameCount, 5);
});

test("play sets status to playing", () => {
  assert.equal(play(initialPlaybackState(5)).status, "playing");
});

test("pause sets status back to paused", () => {
  assert.equal(pause(play(initialPlaybackState(5))).status, "paused");
});

test("next advances one frame and pauses at the boundary automatically", () => {
  const s = next(initialPlaybackState(3));
  assert.equal(s.currentFrameIndex, 1);
});

test("next cannot move past the final frame", () => {
  const atEnd = jumpTo(initialPlaybackState(3), 2);
  assert.equal(next(atEnd).currentFrameIndex, 2);
});

test("previous decrements but not below zero", () => {
  const s = jumpTo(initialPlaybackState(5), 2);
  assert.equal(previous(s).currentFrameIndex, 1);
  assert.equal(previous(previous(previous(s))).currentFrameIndex, 0);
});

test("restart returns to frame zero and pauses", () => {
  const s = play(jumpTo(initialPlaybackState(5), 3));
  const restarted = restart(s);
  assert.equal(restarted.currentFrameIndex, 0);
  assert.equal(restarted.status, "paused");
});

test("jumpTo clamps to the valid frame range", () => {
  assert.equal(jumpTo(initialPlaybackState(5), 99).currentFrameIndex, 4);
  assert.equal(jumpTo(initialPlaybackState(5), -3).currentFrameIndex, 0);
});

test("tick while playing advances one frame", () => {
  const playing = play(initialPlaybackState(5));
  assert.equal(tick(playing).currentFrameIndex, 1);
});

test("tick while paused does nothing", () => {
  const paused = initialPlaybackState(5);
  assert.equal(tick(paused).currentFrameIndex, 0);
});

test("tick auto-pauses on reaching the final frame (completion)", () => {
  const almostDone = play(jumpTo(initialPlaybackState(3), 2));
  const ticked = tick(almostDone);
  assert.equal(ticked.currentFrameIndex, 2);
  assert.equal(ticked.status, "paused");
});

test("a single-frame timeline is immediately at its final frame", () => {
  const s = initialPlaybackState(1);
  assert.equal(s.currentFrameIndex, 0);
  assert.equal(tick(play(s)).currentFrameIndex, 0);
});
