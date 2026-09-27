import type { StressSimulationRunRecord } from "@redline/shared";
import { classifyMetricChange } from "../comparison.js";
import { compareRequirementResults } from "../comparison.js";
import { countRequirementStatuses, formatRequirementScore } from "../resultSummary.js";

const METRIC_LABELS: Record<string, string> = {
  checkoutP95Ms: "Checkout p95",
  dbUtilizationPercent: "DB Utilization",
  totalConnections: "DB Connections",
};

const CHANGE_LABEL = { improved: "Improved", regressed: "Regressed", unchanged: "No material change" } as const;
const CHANGE_CLASS = { improved: "text-emerald-400", regressed: "text-red-400", unchanged: "text-slate-500" } as const;

export function ComparisonPanel({
  baseline,
  current,
  isStrict,
}: {
  baseline: StressSimulationRunRecord;
  current: StressSimulationRunRecord;
  isStrict: boolean;
}) {
  const metricKeys = Object.keys(current.finalMetrics).filter((k) => k in METRIC_LABELS && k in baseline.finalMetrics);
  const requirementDiffs = compareRequirementResults(baseline.requirementResults, current.requirementResults);
  const baselineCounts = countRequirementStatuses(baseline.requirementResults);
  const currentCounts = countRequirementStatuses(current.requirementResults);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baseline vs Current</h3>
      {!isStrict && (
        <p className="mt-1 rounded-md border border-amber-900 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
          Conditions changed - this run used different stress parameters than the baseline, so this comparison isn't strictly apples-to-apples.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-500">Baseline</p>
          <p className="mt-0.5 font-semibold text-slate-200">{formatRequirementScore(baselineCounts)}</p>
        </div>
        <div>
          <p className="text-slate-500">Current</p>
          <p className="mt-0.5 font-semibold text-slate-200">{formatRequirementScore(currentCounts)}</p>
        </div>
      </div>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="pb-1 font-medium">Metric</th>
            <th className="pb-1 font-medium">Baseline</th>
            <th className="pb-1 font-medium">Current</th>
            <th className="pb-1 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {metricKeys.map((key) => {
            const change = classifyMetricChange(key, baseline.finalMetrics[key]!, current.finalMetrics[key]!);
            return (
              <tr key={key} className="border-t border-slate-800">
                <td className="py-1.5 text-slate-300">{METRIC_LABELS[key]}</td>
                <td className="py-1.5 font-mono text-slate-400">{baseline.finalMetrics[key]}</td>
                <td className="py-1.5 font-mono text-slate-200">{current.finalMetrics[key]}</td>
                <td className={`py-1.5 font-medium ${CHANGE_CLASS[change]}`}>{CHANGE_LABEL[change]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col gap-1.5">
        {requirementDiffs.map((diff) => (
          <p key={diff.requirementId} className={`text-xs ${CHANGE_CLASS[diff.change]}`}>
            {diff.requirementId}: {diff.from.toUpperCase()} &rarr; {diff.to.toUpperCase()}
          </p>
        ))}
      </div>
    </div>
  );
}
