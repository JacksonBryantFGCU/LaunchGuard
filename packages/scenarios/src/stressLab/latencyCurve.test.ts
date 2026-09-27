import { test } from "node:test";
import assert from "node:assert/strict";
import { nonlinearUtilizationMultiplier } from "./latencyCurve.js";

test("multiplier is 1 at zero utilization", () => {
  assert.equal(nonlinearUtilizationMultiplier(0), 1);
});

test("multiplier stays near 1 through the healthy band (<=0.70)", () => {
  assert.equal(nonlinearUtilizationMultiplier(0.7), 1);
});

test("multiplier rises gradually through the elevated/degraded band (0.70-0.90)", () => {
  const at75 = nonlinearUtilizationMultiplier(0.75);
  const at90 = nonlinearUtilizationMultiplier(0.9);
  assert.ok(at75 > 1 && at75 < at90);
});

test("multiplier rises sharply approaching saturation (0.90-1.00)", () => {
  const at90 = nonlinearUtilizationMultiplier(0.9);
  const at99 = nonlinearUtilizationMultiplier(0.99);
  const jumpNearSaturation = at99 - at90;
  const jumpMidRange = nonlinearUtilizationMultiplier(0.8) - nonlinearUtilizationMultiplier(0.71);
  assert.ok(jumpNearSaturation > jumpMidRange);
});

test("multiplier grows rapidly past 100% (overload penalty)", () => {
  assert.ok(nonlinearUtilizationMultiplier(1.5) > nonlinearUtilizationMultiplier(1.0));
});

test("invariant: higher utilization never decreases the multiplier", () => {
  const samples = [0, 0.1, 0.3, 0.5, 0.7, 0.71, 0.8, 0.9, 0.95, 1.0, 1.2, 2.0];
  for (let i = 1; i < samples.length; i++) {
    assert.ok(nonlinearUtilizationMultiplier(samples[i]!) >= nonlinearUtilizationMultiplier(samples[i - 1]!), `at ${samples[i]}`);
  }
});
