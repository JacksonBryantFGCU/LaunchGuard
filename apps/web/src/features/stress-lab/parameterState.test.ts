import { test } from "node:test";
import assert from "node:assert/strict";
import type { StressProfile } from "@redline/shared";
import { initializeParameterValues, setParameterValue, resetParameterValues } from "./parameterState.js";

const profile: StressProfile = {
  id: "sustained-load",
  scenarioId: "black-friday-capacity-surge",
  label: "Sustained Load",
  description: "Test steady-state capacity.",
  category: "load",
  durationSeconds: 300,
  stepSeconds: 30,
  parameters: [
    { id: "requestsPerMinute", label: "Traffic", description: "d", type: "number", defaultValue: 15000, min: 5000, max: 60000, step: 1000, editable: true },
    { id: "duration", label: "Duration", description: "d", type: "duration", defaultValue: 300, min: 60, max: 600, step: 30, editable: false },
  ],
};

test("initializeParameterValues seeds every parameter with its default", () => {
  assert.deepEqual(initializeParameterValues(profile), { requestsPerMinute: 15000, duration: 300 });
});

test("setParameterValue updates an editable parameter within range", () => {
  const values = initializeParameterValues(profile);
  const result = setParameterValue(values, profile, "requestsPerMinute", 20000);
  assert.equal(result.error, undefined);
  assert.equal(result.values.requestsPerMinute, 20000);
});

test("setParameterValue rejects a value below the minimum", () => {
  const values = initializeParameterValues(profile);
  const result = setParameterValue(values, profile, "requestsPerMinute", 1000);
  assert.ok(result.error);
  assert.equal(result.values.requestsPerMinute, 15000);
});

test("setParameterValue rejects a value above the maximum", () => {
  const values = initializeParameterValues(profile);
  const result = setParameterValue(values, profile, "requestsPerMinute", 999999);
  assert.ok(result.error);
  assert.equal(result.values.requestsPerMinute, 15000);
});

test("setParameterValue rejects modifying a non-editable parameter", () => {
  const values = initializeParameterValues(profile);
  const result = setParameterValue(values, profile, "duration", 400);
  assert.ok(result.error);
  assert.equal(result.values.duration, 300);
});

test("setParameterValue rejects an unknown parameter id", () => {
  const values = initializeParameterValues(profile);
  const result = setParameterValue(values, profile, "notAParam", 1);
  assert.ok(result.error);
  assert.deepEqual(result.values, values);
});

test("resetParameterValues restores every editable and non-editable parameter to its default", () => {
  const values = { requestsPerMinute: 55000, duration: 300 };
  assert.deepEqual(resetParameterValues(profile), { requestsPerMinute: 15000, duration: 300 });
  // does not mutate the input
  assert.deepEqual(values, { requestsPerMinute: 55000, duration: 300 });
});
