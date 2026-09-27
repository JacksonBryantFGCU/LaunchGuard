import type { StressTestCategory } from "@redline/shared";

// Only the systemMetrics keys the engine actually emits (engine.ts) - never
// a fabricated provider-specific metric. Ordered most-relevant-first, capped
// at 4 (spec #10/#34), keyed off test category so it isn't hardcoded per test.
// Categories with no dedicated selection (not yet implemented by any test
// profile) fall back to the default set below rather than erroring.
const SELECTION_BY_CATEGORY: Partial<Record<StressTestCategory, string[]>> = {
  dependency_degradation: ["checkoutP95Ms", "availabilityPercent", "trafficRequestsPerMinute"],
  resource_saturation: ["totalConnections", "dbUtilizationPercent", "checkoutP95Ms", "trafficRequestsPerMinute"],
  spike: ["trafficRequestsPerMinute", "checkoutP95Ms", "dbUtilizationPercent"],
  regional_failure: ["availabilityPercent", "checkoutP95Ms", "trafficRequestsPerMinute"],
  load: ["checkoutP95Ms", "trafficRequestsPerMinute", "dbUtilizationPercent"],
};

const DEFAULT_SELECTION = ["checkoutP95Ms", "trafficRequestsPerMinute", "availabilityPercent", "dbUtilizationPercent"];

export function selectLiveMetricKeys(category: StressTestCategory): string[] {
  return SELECTION_BY_CATEGORY[category] ?? DEFAULT_SELECTION;
}
