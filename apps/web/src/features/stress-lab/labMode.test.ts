import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveLabMode } from "./labMode.js";
import { initialPlaybackState, jumpTo, play } from "./playback.js";

test("no active result -> configure", () => {
  assert.equal(deriveLabMode(false, initialPlaybackState(0)), "configure");
});

test("active result mid-playback -> simulate", () => {
  assert.equal(deriveLabMode(true, play(initialPlaybackState(5))), "simulate");
});

test("active result paused before the end -> simulate", () => {
  assert.equal(deriveLabMode(true, jumpTo(initialPlaybackState(5), 2)), "simulate");
});

test("active result at final frame -> analyze", () => {
  assert.equal(deriveLabMode(true, jumpTo(initialPlaybackState(5), 4)), "analyze");
});

test("scrubbing back from the end returns to simulate", () => {
  const atEnd = jumpTo(initialPlaybackState(5), 4);
  assert.equal(deriveLabMode(true, atEnd), "analyze");
  const scrubbedBack = jumpTo(atEnd, 2);
  assert.equal(deriveLabMode(true, scrubbedBack), "simulate");
});
