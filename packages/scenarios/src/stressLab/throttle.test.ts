import { test } from "node:test";
import assert from "node:assert/strict";
import { applyThrottle } from "./throttle.js";

test("demand under the rate limit is fully admitted", () => {
  const result = applyThrottle(800, 1000);
  assert.equal(result.admitted, 800);
  assert.equal(result.rejected, 0);
});

test("demand over the rate limit is capped, and the excess is rejected rather than silently dropped", () => {
  const result = applyThrottle(1500, 1000);
  assert.equal(result.admitted, 1000);
  assert.equal(result.rejected, 500);
});

test("no rate limit configured (undefined) admits everything", () => {
  const result = applyThrottle(5000, undefined);
  assert.equal(result.admitted, 5000);
  assert.equal(result.rejected, 0);
});

test("throttling protects downstream capacity: admitted demand never exceeds the configured limit regardless of input size", () => {
  const result = applyThrottle(1_000_000, 1000);
  assert.equal(result.admitted, 1000);
});
