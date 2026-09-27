// Deterministic educational approximation of how latency behaves as a
// capacity-limited resource approaches and exceeds saturation (spec #8).
// Not a real queueing-theory curve - a monotonic step-then-steepen shape
// chosen so the invariant "higher utilization never decreases latency"
// holds everywhere, and so the curve visibly steepens near/above capacity:
//
//   <= 0.70            : 1x   (healthy - no penalty)
//   0.70 - 0.90         : 1x -> 2x   (elevated/degraded - gradual rise)
//   0.90 - 1.00         : 2x -> 5x   (near saturation - sharp rise)
//   > 1.00              : 5x + 20x per unit over capacity (overload penalty)
export function nonlinearUtilizationMultiplier(utilization: number): number {
  if (utilization <= 0.7) return 1;
  if (utilization <= 0.9) return 1 + (utilization - 0.7) * 5;
  if (utilization < 1.0) return 2 + (utilization - 0.9) * 30;
  return 5 + (utilization - 1.0) * 20;
}
