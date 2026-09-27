import type { SimulationBottleneck, SimulationRequirementResult } from "@redline/shared";

export interface RequirementStatusCounts {
  met: number;
  at_risk: number;
  violated: number;
  total: number;
}

export function countRequirementStatuses(requirements: SimulationRequirementResult[]): RequirementStatusCounts {
  return requirements.reduce<RequirementStatusCounts>(
    (counts, r) => ({ ...counts, [r.status]: counts[r.status] + 1, total: counts.total + 1 }),
    { met: 0, at_risk: 0, violated: 0, total: 0 },
  );
}

export function formatRequirementScore(counts: RequirementStatusCounts): string {
  return `${counts.met} / ${counts.total} passing`;
}

const SEVERITY_RANK: Record<SimulationBottleneck["severity"], number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Highest-severity bottleneck only - never surfaces a hidden fix, just what's observed (spec #29). */
export function primaryBottleneck(bottlenecks: SimulationBottleneck[]): SimulationBottleneck | undefined {
  return bottlenecks.reduce<SimulationBottleneck | undefined>(
    (worst, b) => (!worst || SEVERITY_RANK[b.severity] > SEVERITY_RANK[worst.severity] ? b : worst),
    undefined,
  );
}
