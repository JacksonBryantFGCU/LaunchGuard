export interface ThrottleResult {
  admitted: number;
  rejected: number;
}

// Rate limiting protects a downstream bottleneck by admitting only up to a
// configured limit and explicitly rejecting the rest (spec #24) - never
// silently dropping demand.
export function applyThrottle(demand: number, requestRateLimit: number | undefined): ThrottleResult {
  if (requestRateLimit == null) return { admitted: demand, rejected: 0 };
  const admitted = Math.min(demand, requestRateLimit);
  return { admitted, rejected: demand - admitted };
}
