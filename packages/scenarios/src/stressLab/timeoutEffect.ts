export interface TimeoutResult {
  boundedLatencyMs: number;
  additionalErrorRate: number;
}

// A timeout bounds how long a caller waits (spec #17) - it does not heal
// the slow dependency. Waiting is capped at timeoutMs; the request instead
// fails once the overshoot is large enough that failing fast is what
// actually happened. additionalErrorRate scales with how far latency
// overshot the timeout, capped at 1 (100%).
export function applyTimeout(latencyMs: number, timeoutMs: number | undefined): TimeoutResult {
  if (timeoutMs == null || latencyMs <= timeoutMs) {
    return { boundedLatencyMs: latencyMs, additionalErrorRate: 0 };
  }
  const overshootRatio = (latencyMs - timeoutMs) / timeoutMs;
  return { boundedLatencyMs: timeoutMs, additionalErrorRate: Math.min(1, overshootRatio) };
}
