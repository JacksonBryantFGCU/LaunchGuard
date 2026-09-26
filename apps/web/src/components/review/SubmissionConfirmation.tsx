import type { ReviewDecision } from "@redline/shared";
import { DECISION_LABELS } from "../../features/review/decisions.js";

interface SubmissionConfirmationProps {
  decision: ReviewDecision;
  commentCount: number;
  reviewedCount: number;
  totalCount: number;
  submitting: boolean;
  errorMessage?: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function SubmissionConfirmation({
  decision,
  commentCount,
  reviewedCount,
  totalCount,
  submitting,
  errorMessage,
  onBack,
  onConfirm,
}: SubmissionConfirmationProps) {
  return (
    <section aria-labelledby="submit-confirm-heading" className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 id="submit-confirm-heading" className="text-sm font-semibold text-slate-100">
        Submit review?
      </h2>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Decision</dt>
          <dd className="font-medium text-slate-100">{DECISION_LABELS[decision]}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Comments</dt>
          <dd className="font-medium text-slate-100">{commentCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Files reviewed</dt>
          <dd className="font-medium text-slate-100">
            {reviewedCount} / {totalCount}
          </dd>
        </div>
      </dl>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 flex gap-2" aria-live="polite">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </section>
  );
}
