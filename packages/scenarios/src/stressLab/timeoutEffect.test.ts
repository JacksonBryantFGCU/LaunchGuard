import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTimeout } from "./timeoutEffect.js";

test("latency under the timeout passes through unbounded and adds no errors", () => {
  const result = applyTimeout(500, 2000);
  assert.equal(result.boundedLatencyMs, 500);
  assert.equal(result.additionalErrorRate, 0);
});

test("latency exceeding the timeout is capped at the timeout value", () => {
  const result = applyTimeout(5000, 2000);
  assert.equal(result.boundedLatencyMs, 2000);
});

test("latency exceeding the timeout produces a nonzero additional error rate (timeouts bound waiting, not fix the dependency)", () => {
  const result = applyTimeout(5000, 2000);
  assert.ok(result.additionalErrorRate > 0);
});

test("a longer overshoot past the timeout produces a higher error rate", () => {
  const small = applyTimeout(2500, 2000);
  const large = applyTimeout(10000, 2000);
  assert.ok(large.additionalErrorRate > small.additionalErrorRate);
});

test("error rate is capped at 1 (100%) no matter how extreme the overshoot", () => {
  const result = applyTimeout(1000000, 2000);
  assert.ok(result.additionalErrorRate <= 1);
});

test("no timeout configured (undefined) passes latency through unchanged", () => {
  const result = applyTimeout(5000, undefined);
  assert.equal(result.boundedLatencyMs, 5000);
  assert.equal(result.additionalErrorRate, 0);
});
