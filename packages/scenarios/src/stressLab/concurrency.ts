// Little's Law reasoning (spec #9), not exact queueing-theory fidelity:
// the number of requests in flight approximately equals the rate they
// arrive times how long each one takes to complete. Used to explain why a
// slow synchronous dependency raises the caller's own concurrency/capacity
// pressure even when incoming traffic hasn't changed.
export function estimateConcurrency(arrivalRatePerSecond: number, averageResponseTimeSeconds: number): number {
  return arrivalRatePerSecond * averageResponseTimeSeconds;
}
