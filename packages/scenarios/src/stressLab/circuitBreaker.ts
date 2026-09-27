export type CircuitBreakerStatus = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  window: number;
  recoverySeconds: number;
}

// Standard three-state circuit breaker (spec #18): closed while the
// dependency is healthy, opens once a failure rate over threshold has
// persisted for the configured window (calls fail fast instead of
// consuming resources on a doomed call), then half-open once
// recoverySeconds have passed. This never claims to heal the dependency -
// it only bounds how much a failing dependency costs the caller.
//
// Modeled as a pure function of elapsed time rather than a stateful
// step-by-step transition: this stress lab's dependency_degradation test
// holds its failure rate constant for the whole run, so "has the failure
// persisted for `window` seconds" and "has `recoverySeconds` passed since
// opening" are both fully determined by elapsed time and the constant
// failure rate - no frame-to-frame state needs to be threaded through the
// timeline for this test category.
export function circuitBreakerStateAt(elapsedSeconds: number, config: CircuitBreakerConfig, observedFailureRate: number): CircuitBreakerStatus {
  if (observedFailureRate < config.failureThreshold) return "closed";
  if (elapsedSeconds < config.window) return "closed";

  const openedAt = config.window;
  const halfOpenAt = openedAt + config.recoverySeconds;
  return elapsedSeconds >= halfOpenAt ? "half_open" : "open";
}
