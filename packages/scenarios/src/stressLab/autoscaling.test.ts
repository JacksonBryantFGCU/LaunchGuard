import { test } from "node:test";
import assert from "node:assert/strict";
import { stepAutoscale, type AutoscalePolicy } from "./autoscaling.js";

const policy: AutoscalePolicy = { minInstances: 3, maxInstances: 20, scaleStep: 2, cooldownSeconds: 30 };

test("no change needed: instances stay the same", () => {
  const result = stepAutoscale({ instances: 3, secondsSinceLastScale: 100 }, 3, policy, 5);
  assert.equal(result.instances, 3);
});

test("scaling out is gradual: instances increase by at most scaleStep per eligible step, not jump straight to target", () => {
  const result = stepAutoscale({ instances: 3, secondsSinceLastScale: 100 }, 20, policy, 5);
  assert.equal(result.instances, 5); // 3 + scaleStep(2)
});

test("scaling out respects cooldown: no further increase until cooldownSeconds has elapsed since the last scale event", () => {
  const justScaled = stepAutoscale({ instances: 3, secondsSinceLastScale: 5 }, 20, policy, 5);
  assert.equal(justScaled.instances, 3);
});

test("instances never exceed maxInstances even after many eligible scale-out steps", () => {
  let state = { instances: 3, secondsSinceLastScale: 100 };
  for (let i = 0; i < 50; i++) {
    state = stepAutoscale(state, 1000, policy, 30);
  }
  assert.equal(state.instances, policy.maxInstances);
});

test("instances never fall below minInstances", () => {
  const result = stepAutoscale({ instances: 3, secondsSinceLastScale: 100 }, 0, policy, 5);
  assert.ok(result.instances >= policy.minInstances);
});

test("traffic spike scenario: demand rises, and after enough eligible steps instances reach the needed level without exceeding maxInstances", () => {
  let state = { instances: 3, secondsSinceLastScale: 1000 };
  const neededInstances = 9;
  for (let i = 0; i < 10; i++) {
    state = stepAutoscale(state, neededInstances, policy, policy.cooldownSeconds);
  }
  assert.equal(state.instances, neededInstances);
});

test("secondsSinceLastScale resets to zero on a step that actually changes instance count", () => {
  const result = stepAutoscale({ instances: 3, secondsSinceLastScale: 100 }, 20, policy, 5);
  assert.equal(result.secondsSinceLastScale, 0);
});

test("secondsSinceLastScale accumulates when no scaling occurs", () => {
  const result = stepAutoscale({ instances: 3, secondsSinceLastScale: 5 }, 3, policy, 5);
  assert.equal(result.secondsSinceLastScale, 10);
});
