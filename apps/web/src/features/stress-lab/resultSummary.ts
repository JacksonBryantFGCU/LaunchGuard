import type { SimulationBottleneck, SimulationRequirementResult } from "@purgatory/shared";

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

/**
 * Best-available correlation between a requirement result and the bottleneck
 * that likely caused it. The API's result shape has no structural link
 * between the two (no shared id) - this only checks whether the bottleneck's
 * targetId or metric name is textually mentioned in the requirement's own
 * explanation/observedValue text, which the simulation already authored.
 * Returns undefined rather than guessing when nothing matches; when several
 * match, the highest-severity one wins (spec: never fabricate causality the
 * API doesn't support).
 */
export function correlateRequirementBottleneck(
  requirement: SimulationRequirementResult,
  bottlenecks: SimulationBottleneck[],
): SimulationBottleneck | undefined {
  const haystack = `${requirement.explanation} ${requirement.observedValue ?? ""}`.toLowerCase();
  const matches = bottlenecks.filter(
    (b) => haystack.includes(b.targetId.toLowerCase()) || haystack.includes(b.metric.toLowerCase()),
  );
  return primaryBottleneck(matches);
}
