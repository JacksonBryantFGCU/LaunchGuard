export type RetryBackoff = "none" | "fixed" | "exponential";

// Retries can amplify traffic (spec #19): each failed call may be retried,
// and each retry can itself fail and be retried again, up to retryCount
// attempts. Effective demand is a geometric series bounded by retryCount -
// naturally finite, never an infinite retry loop.
//
// Backoff doesn't change how much total retry traffic eventually happens,
// but it spreads retries out over time instead of concentrating them in
// the same instant (spec #20). Since this is a single-frame steady-state
// approximation rather than a discrete per-request retry queue, backoff is
// modeled as a damping factor on how much of that retry mass lands in THIS
// frame: none=1 (all of it, immediately), fixed=0.6, exponential=0.3
// (spread furthest into the future, so least of it shows up right now).
const BACKOFF_DAMPING: Record<RetryBackoff, number> = { none: 1, fixed: 0.6, exponential: 0.3 };

export function amplifyDemandWithRetries(baseDemand: number, retryableFailureRate: number, retryCount: number, backoff: RetryBackoff): number {
  const damping = BACKOFF_DAMPING[backoff];
  let retryMass = 0;
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    retryMass += retryableFailureRate ** attempt;
  }
  return baseDemand * (1 + damping * retryMass);
}
