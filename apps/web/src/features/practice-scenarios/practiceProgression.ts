import type { PracticeScenario, PracticeScenarioAttemptSummary } from "@purgatory/shared";

export type ScenarioDisplayStatus = "locked" | "available" | "in_progress" | "completed";

export interface ScenarioListEntry {
  scenario: PracticeScenario;
  displayStatus: ScenarioDisplayStatus;
  summary: PracticeScenarioAttemptSummary | null;
}

/**
 * Sequential progression: scenario N is locked until scenario N-1 is
 * completed. No status is persisted for "locked"/"available" - both are
 * derived here from whether an attempt row exists yet (Phase 2 §4).
 */
export function deriveScenarioListStatus(
  scenarios: PracticeScenario[],
  summaries: PracticeScenarioAttemptSummary[],
): ScenarioListEntry[] {
  const summaryById = new Map(summaries.map((s) => [s.practiceScenarioId, s]));
  const ordered = [...scenarios].sort((a, b) => a.order - b.order);

  let previousCompleted = true;
  return ordered.map((scenario) => {
    const summary = summaryById.get(scenario.id) ?? null;
    const unlocked = previousCompleted;
    previousCompleted = summary?.status === "completed";

    const displayStatus: ScenarioDisplayStatus = !unlocked
      ? "locked"
      : summary?.status === "completed"
        ? "completed"
        : summary
          ? "in_progress"
          : "available";

    return { scenario, displayStatus, summary };
  });
}
