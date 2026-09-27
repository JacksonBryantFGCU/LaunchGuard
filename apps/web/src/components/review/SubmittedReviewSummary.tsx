import type { ArchitectureRecommendation } from "@purgatory/shared";
import { RECOMMENDATION_LABELS } from "../../features/architecture-review/recommendationLabels.js";

interface Props {
  reviewId: string;
  submittedAt: string;
  recommendation: ArchitectureRecommendation;
  redlineCount: number;
  reviewedNodeCount: number;
  totalNodeCount: number;
  reviewedEdgeCount: number;
  totalEdgeCount: number;
}

export function SubmittedReviewSummary({
  reviewId,
  submittedAt,
  recommendation,
  redlineCount,
  reviewedNodeCount,
  totalNodeCount,
  reviewedEdgeCount,
  totalEdgeCount,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div>
        <h1 className="text-base font-semibold text-slate-100">Architecture Review Submitted</h1>
        <p className="mt-1 text-xs text-slate-500">
          Review {reviewId} · {new Date(submittedAt).toLocaleString()}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Recommendation</dt>
          <dd className="font-medium text-slate-200">{RECOMMENDATION_LABELS[recommendation]}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Redlines</dt>
          <dd className="font-medium text-slate-200">{redlineCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Components Reviewed</dt>
          <dd className="font-medium text-slate-200">
            {reviewedNodeCount} / {totalNodeCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Connections Reviewed</dt>
          <dd className="font-medium text-slate-200">
            {reviewedEdgeCount} / {totalEdgeCount}
          </dd>
        </div>
      </dl>

      <p className="rounded-md border border-dashed border-slate-800 p-3 text-xs text-slate-500">
        Your architecture review has been submitted. Stress-test results and evaluation will be available in the next stage.
      </p>
    </div>
  );
}
