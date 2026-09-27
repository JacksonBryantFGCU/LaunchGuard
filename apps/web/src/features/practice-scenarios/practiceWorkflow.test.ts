import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveResourceTab,
  isResponseLocked,
  canOpenResult,
  canOpenConsequence,
  nextAutosaveStatus,
} from "./practiceWorkflow.js";

test("resolveResourceTab accepts every known tab", () => {
  for (const tab of ["overview", "metrics", "requirements", "architecture", "architect", "response"]) {
    assert.equal(resolveResourceTab(tab), tab);
  }
});

test("resolveResourceTab falls back to overview for an invalid tab", () => {
  assert.equal(resolveResourceTab("not-a-tab"), "overview");
  assert.equal(resolveResourceTab(null), "overview");
  assert.equal(resolveResourceTab(undefined), "overview");
});

test("isResponseLocked is false only while investigating", () => {
  assert.equal(isResponseLocked("investigating"), false);
  assert.equal(isResponseLocked("submitted"), true);
  assert.equal(isResponseLocked("feedback_ready"), true);
  assert.equal(isResponseLocked("consequence_ready"), true);
  assert.equal(isResponseLocked("completed"), true);
});

test("canOpenResult is false before submission, true after", () => {
  assert.equal(canOpenResult("investigating"), false);
  assert.equal(canOpenResult("submitted"), true);
  assert.equal(canOpenResult("feedback_ready"), true);
  assert.equal(canOpenResult("completed"), true);
});

test("canOpenConsequence requires feedback to exist first", () => {
  assert.equal(canOpenConsequence("investigating"), false);
  assert.equal(canOpenConsequence("submitted"), false);
  assert.equal(canOpenConsequence("feedback_ready"), true);
  assert.equal(canOpenConsequence("consequence_ready"), true);
  assert.equal(canOpenConsequence("completed"), true);
});

test("autosave status transitions: start -> saving, success -> saved, failure -> error, retry -> saving", () => {
  assert.equal(nextAutosaveStatus("idle", "start"), "saving");
  assert.equal(nextAutosaveStatus("saving", "success"), "saved");
  assert.equal(nextAutosaveStatus("saving", "failure"), "error");
  assert.equal(nextAutosaveStatus("error", "start"), "saving");
});
