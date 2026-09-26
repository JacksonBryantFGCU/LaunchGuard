import type { ReviewDecision } from "@redline/shared";
import { DECISION_LABELS } from "../../features/review/decisions.js";

interface SubmittedReviewSummaryProps {
  decision: ReviewDecision;
  commentCount: number;
  reviewedCount: number;
  totalCount: number;
  reviewId: string;
  submittedAt: string;
}

export function SubmittedReviewSummary({
  decision,
  commentCount,
  reviewedCount,
  totalCount,
  reviewId,
  submittedAt,
}: SubmittedReviewSummaryProps) {
  return (
    <section aria-labelledby="submitted-heading" className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-4">
      <h2 id="submitted-heading" className="text-sm font-semibold text-emerald-300">
        Review submitted
      </h2>
      <p className="mt-1 text-sm text-slate-300">{DECISION_LABELS[decision]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Inline comments</dt>
          <dd className="font-medium text-slate-100">{commentCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Files reviewed</dt>
          <dd className="font-medium text-slate-100">
            {reviewedCount} / {totalCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Submitted</dt>
          <dd className="font-medium text-slate-100">{new Date(submittedAt).toLocaleString()}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-slate-500">Review ID: {reviewId}</p>
    </section>
  );
}
