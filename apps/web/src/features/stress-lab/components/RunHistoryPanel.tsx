import type { StressSimulationRunRecord } from "@redline/shared";
import { describeModificationDelta } from "../runHistory.js";
import { countRequirementStatuses, formatRequirementScore } from "../resultSummary.js";

export function RunHistoryPanel({
  runs,
  activeRunId,
  onSelect,
}: {
  runs: StressSimulationRunRecord[];
  activeRunId: string | undefined;
  onSelect: (run: StressSimulationRunRecord) => void;
}) {
  if (runs.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Run History</h3>
        <p className="mt-2 text-xs text-slate-500">No runs yet. Run the baseline to see how the current architecture behaves.</p>
      </div>
    );
  }

  const sorted = [...runs].sort((a, b) => a.runNumber - b.runNumber);
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Run History</h3>
      <ol className="mt-2 flex flex-col gap-1.5">
        {sorted.map((run) => {
          const counts = countRequirementStatuses(run.requirementResults);
          const isBaseline = run.runNumber === 1;
          return (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => onSelect(run)}
                aria-current={run.id === activeRunId}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                  run.id === activeRunId ? "border-sky-500 bg-sky-950/40" : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <span className="text-slate-200">
                  #{run.runNumber} {isBaseline ? "Baseline" : describeModificationDelta(run.modifications)}
                </span>
                <span className="flex items-center gap-2">
                  <span className={run.passed ? "text-emerald-400" : "text-red-400"}>{run.passed ? "Passed" : "Failed"}</span>
                  <span className="text-slate-500">{formatRequirementScore(counts)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
