import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateConcurrency } from "./concurrency.js";

test("Little's Law: concurrency = arrival rate x response time", () => {
  // 100 req/sec, 0.2s average response time -> 20 requests in flight.
  assert.equal(estimateConcurrency(100, 0.2), 20);
});

test("slower response time at the same arrival rate increases concurrency", () => {
  const fast = estimateConcurrency(100, 0.2);
  const slow = estimateConcurrency(100, 1.5);
  assert.ok(slow > fast);
});

test("a slow synchronous payment provider raises checkout concurrency at the same traffic level", () => {
  const requestsPerSecond = 500;
  const ownProcessingSeconds = 0.05;
  const fastProviderLatencySeconds = 0.2;
  const slowProviderLatencySeconds = 4.0;

  const concurrencyWithFastProvider = estimateConcurrency(requestsPerSecond, ownProcessingSeconds + fastProviderLatencySeconds);
  const concurrencyWithSlowProvider = estimateConcurrency(requestsPerSecond, ownProcessingSeconds + slowProviderLatencySeconds);

  assert.ok(concurrencyWithSlowProvider > concurrencyWithFastProvider);
});

test("zero arrival rate has zero concurrency regardless of latency", () => {
  assert.equal(estimateConcurrency(0, 5), 0);
});
