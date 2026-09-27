import { test } from "node:test";
import assert from "node:assert/strict";
import { amplifyDemandWithRetries } from "./retryAmplification.js";

test("zero failure rate never amplifies demand", () => {
  assert.equal(amplifyDemandWithRetries(1000, 0, 3, "none"), 1000);
});

test("a failing dependency with retries amplifies effective downstream demand", () => {
  const amplified = amplifyDemandWithRetries(1000, 0.3, 3, "none");
  assert.ok(amplified > 1000);
});

test("more retry attempts amplify demand further (retry storm risk)", () => {
  const fewRetries = amplifyDemandWithRetries(1000, 0.3, 1, "none");
  const manyRetries = amplifyDemandWithRetries(1000, 0.3, 5, "none");
  assert.ok(manyRetries > fewRetries);
});

test("retries never amplify beyond a bounded ceiling even with high failure rate and many attempts (no infinite retry loop)", () => {
  const amplified = amplifyDemandWithRetries(1000, 0.95, 10, "none");
  assert.ok(Number.isFinite(amplified));
  assert.ok(amplified < 1000 * 25);
});

test("exponential backoff dampens the immediate-frame amplification compared to no backoff", () => {
  const noBackoff = amplifyDemandWithRetries(1000, 0.5, 4, "none");
  const fixedBackoff = amplifyDemandWithRetries(1000, 0.5, 4, "fixed");
  const exponentialBackoff = amplifyDemandWithRetries(1000, 0.5, 4, "exponential");
  assert.ok(fixedBackoff < noBackoff);
  assert.ok(exponentialBackoff < fixedBackoff);
});

test("determinism: same inputs always produce the same amplified demand", () => {
  assert.equal(amplifyDemandWithRetries(1000, 0.4, 3, "fixed"), amplifyDemandWithRetries(1000, 0.4, 3, "fixed"));
});
