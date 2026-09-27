import type { ArchitectureModification, StressSimulationRunRecord } from "@redline/shared";

export function groupRunsByTest(runs: StressSimulationRunRecord[]): Record<string, StressSimulationRunRecord[]> {
  const grouped: Record<string, StressSimulationRunRecord[]> = {};
  for (const run of runs) {
    (grouped[run.testId] ??= []).push(run);
  }
  return grouped;
}

/** The first run (by runNumber) is the baseline, immutably - never re-derived from array order or wall-clock time (spec #32/#69). */
export function deriveBaselineRun(runsForTest: StressSimulationRunRecord[]): StressSimulationRunRecord | undefined {
  return runsForTest.reduce<StressSimulationRunRecord | undefined>(
    (baseline, run) => (!baseline || run.runNumber < baseline.runNumber ? run : baseline),
    undefined,
  );
}

export function latestRun(runsForTest: StressSimulationRunRecord[]): StressSimulationRunRecord | undefined {
  return runsForTest.reduce<StressSimulationRunRecord | undefined>(
    (latest, run) => (!latest || run.runNumber > latest.runNumber ? run : latest),
    undefined,
  );
}

function humanize(componentType: string): string {
  return componentType
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** A generated label, never a fabricated narrative (spec #42): baseline, one change named, or a plain count for several. */
export function describeModificationDelta(modifications: ArchitectureModification[]): string {
  if (modifications.length === 0) return "Baseline";
  if (modifications.length === 1) {
    const mod = modifications[0]!;
    return mod.kind === "add-component" ? `+ ${humanize(mod.componentType)}` : "1 design change";
  }
  return `${modifications.length} design changes`;
}
