import type { Redline } from "@purgatory/shared";
import { RISK_CATEGORY_LABELS, SEVERITY_LABELS, SEVERITY_ORDER } from "../../features/scenarios/labels.js";
import { ReviewProgress } from "./ReviewProgress.js";

interface Props {
  redlines: Redline[];
  reviewedNodeCount: number;
  totalNodeCount: number;
  reviewedEdgeCount: number;
  totalEdgeCount: number;
}

// Summarizes only the reviewer's own redlines - never compared against hidden truth.
export function ReviewCoverageSummary({ redlines, reviewedNodeCount, totalNodeCount, reviewedEdgeCount, totalEdgeCount }: Props) {
  const severityCounts = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: redlines.filter((r) => r.severity === severity).length,
  })).filter((entry) => entry.count > 0);

  const categoryCounts = Object.entries(
    redlines.reduce<Partial<Record<Redline["category"], number>>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {}),
  ) as [Redline["category"], number][];

  return (
    <div className="flex flex-col gap-4">
      <ReviewProgress
        reviewedNodeCount={reviewedNodeCount}
        totalNodeCount={totalNodeCount}
        reviewedEdgeCount={reviewedEdgeCount}
        totalEdgeCount={totalEdgeCount}
        redlineCount={redlines.length}
      />

      {redlines.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By Severity</p>
            <dl className="mt-1 flex flex-col gap-1">
              {severityCounts.map(({ severity, count }) => (
                <div key={severity} className="flex justify-between text-xs text-slate-300">
                  <dt>{SEVERITY_LABELS[severity]}</dt>
                  <dd className="font-medium text-slate-100">{count}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By Category</p>
            <dl className="mt-1 flex flex-col gap-1">
              {categoryCounts.map(([category, count]) => (
                <div key={category} className="flex justify-between text-xs text-slate-300">
                  <dt>{RISK_CATEGORY_LABELS[category]}</dt>
                  <dd className="font-medium text-slate-100">{count}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
