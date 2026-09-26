import { Link, Navigate } from "react-router-dom";
import { useReviewSessionContext } from "../features/review/reviewSessionContextInternal.js";
import { SubmittedReviewSummary } from "../components/review/SubmittedReviewSummary.js";

export function SubmittedReviewPage() {
  const { scenario, state } = useReviewSessionContext();

  if (state.submissionStatus !== "submitted" || !state.decision || !state.reviewId || !state.submittedAt) {
    return <Navigate to={`/review/${scenario.slug}`} replace />;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-lg font-semibold text-slate-100">{scenario.title}</h1>
      <p className="mt-1 text-sm text-slate-400">PR #{scenario.pullRequest.number}</p>

      <div className="mt-4">
        <SubmittedReviewSummary
          decision={state.decision}
          commentCount={state.comments.length}
          reviewedCount={state.reviewedFiles.size}
          totalCount={scenario.files.length}
          reviewId={state.reviewId}
          submittedAt={state.submittedAt}
        />
      </div>

      <Link
        to={`/review/${scenario.slug}`}
        className="mt-4 inline-block text-sm font-medium text-slate-100 underline underline-offset-4"
      >
        Inspect files
      </Link>
    </main>
  );
}
