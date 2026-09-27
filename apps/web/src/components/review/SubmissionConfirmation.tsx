import type { ArchitectureRecommendation } from "@purgatory/shared";
import { RECOMMENDATION_LABELS } from "../../features/architecture-review/recommendationLabels.js";

interface Props {
  recommendation: ArchitectureRecommendation;
  reviewedNodeCount: number;
  totalNodeCount: number;
  reviewedEdgeCount: number;
  totalEdgeCount: number;
  redlineCount: number;
  submitting: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export function SubmissionConfirmation({
  recommendation,
  reviewedNodeCount,
  totalNodeCount,
  reviewedEdgeCount,
  totalEdgeCount,
  redlineCount,
  submitting,
  errorMessage,
  onBack,
  onConfirm,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-base font-semibold text-slate-100">Submit Architecture Review?</h2>

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

      <p className="text-xs text-slate-500">Once submitted, your review will be locked.</p>

      {errorMessage && (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          aria-busy={submitting}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
