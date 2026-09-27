import { test } from "node:test";
import assert from "node:assert/strict";
import { circuitBreakerStateAt } from "./circuitBreaker.js";

const config = { failureThreshold: 0.5, window: 10, recoverySeconds: 30 };

test("closed while the observed failure rate stays under the threshold", () => {
  assert.equal(circuitBreakerStateAt(20, config, 0.2), "closed");
});

test("stays closed until the failure has persisted for the configured window", () => {
  assert.equal(circuitBreakerStateAt(5, config, 0.9), "closed");
});

test("opens once a sustained failure rate over threshold has lasted the configured window", () => {
  assert.equal(circuitBreakerStateAt(15, config, 0.9), "open");
});

test("moves to half-open once recoverySeconds have passed since opening", () => {
  // Opens at t=10 (window), recoverySeconds=30 -> half-open at t=40+.
  assert.equal(circuitBreakerStateAt(45, config, 0.9), "half_open");
});

test("while open, calls fail fast (this is a pure state function - callers check for \"open\" to short-circuit)", () => {
  assert.equal(circuitBreakerStateAt(20, config, 0.9), "open");
});

test("a dependency that recovers (failure rate drops back under threshold) never opens the breaker", () => {
  assert.equal(circuitBreakerStateAt(100, config, 0.1), "closed");
});
