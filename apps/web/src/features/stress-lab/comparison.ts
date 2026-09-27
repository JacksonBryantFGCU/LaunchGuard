import type { RequirementImpactStatus, SimulationRequirementResult, StressParameterValues } from "@purgatory/shared";

export type ChangeDirection = "improved" | "regressed" | "unchanged";

// Domain-aware direction per metric (spec #38): never assume larger = better.
const LOWER_IS_BETTER = new Set(["checkoutP95Ms", "errorRatePercent", "dbUtilizationPercent", "totalConnections"]);
const HIGHER_IS_BETTER = new Set(["availabilityPercent", "throughputRpm", "trafficRequestsPerMinute"]);

/** Unrecognized metric keys fall back to "unchanged" rather than guessing a direction (spec #38). */
export function classifyMetricChange(metricKey: string, baseline: number, current: number): ChangeDirection {
  if (current === baseline) return "unchanged";
  if (LOWER_IS_BETTER.has(metricKey)) return current < baseline ? "improved" : "regressed";
  if (HIGHER_IS_BETTER.has(metricKey)) return current > baseline ? "improved" : "regressed";
  return "unchanged";
}

const STATUS_RANK: Record<RequirementImpactStatus, number> = { violated: 0, at_risk: 1, met: 2 };

export function classifyRequirementChange(from: RequirementImpactStatus, to: RequirementImpactStatus): ChangeDirection {
  if (STATUS_RANK[to] === STATUS_RANK[from]) return "unchanged";
  return STATUS_RANK[to] > STATUS_RANK[from] ? "improved" : "regressed";
}

export interface RequirementDiff {
  requirementId: string;
  from: RequirementImpactStatus;
  to: RequirementImpactStatus;
  change: ChangeDirection;
}

/** Pairs baseline/current results by requirementId; a requirement missing from either side is skipped rather than guessed. */
export function compareRequirementResults(
  baseline: SimulationRequirementResult[],
  current: SimulationRequirementResult[],
): RequirementDiff[] {
  const currentById = new Map(current.map((r) => [r.requirementId, r]));
  const diffs: RequirementDiff[] = [];
  for (const base of baseline) {
    const match = currentById.get(base.requirementId);
    if (!match) continue;
    diffs.push({
      requirementId: base.requirementId,
      from: base.status,
      to: match.status,
      change: classifyRequirementChange(base.status, match.status),
    });
  }
  return diffs;
}

/** Strict before/after comparison requires the same test AND identical parameters (spec #46/#70) - otherwise conditions changed and the comparison must be labeled, not hidden. */
export function isStrictComparison(
  baselineTestId: string,
  baselineParameters: StressParameterValues,
  currentTestId: string,
  currentParameters: StressParameterValues,
): boolean {
  if (baselineTestId !== currentTestId) return false;
  const baseKeys = Object.keys(baselineParameters);
  const currentKeys = Object.keys(currentParameters);
  if (baseKeys.length !== currentKeys.length) return false;
  return baseKeys.every((key) => baselineParameters[key] === currentParameters[key]);
}
