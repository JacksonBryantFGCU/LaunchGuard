import { Link, Navigate, useOutletContext } from "react-router-dom";
import { useReviewState } from "../features/architecture-review/reviewStateStore.js";
import { SubmittedReviewSummary } from "../components/review/SubmittedReviewSummary.js";
import type { ReviewOutletContext } from "./ArchitectureReviewLayout.js";

export function SubmittedReviewPage() {
  const { scenario } = useOutletContext<ReviewOutletContext>();
  const { state } = useReviewState();

  if (state.submissionStatus !== "submitted" || !state.reviewId || !state.submittedAt || !state.recommendation) {
    return <Navigate to={`/app/review/${scenario.slug}/submit`} replace />;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <SubmittedReviewSummary
        reviewId={state.reviewId}
        submittedAt={state.submittedAt}
        recommendation={state.recommendation}
        redlineCount={state.redlines.length}
        reviewedNodeCount={state.reviewedNodeIds.length}
        totalNodeCount={scenario.nodes.length}
        reviewedEdgeCount={state.reviewedEdgeIds.length}
        totalEdgeCount={scenario.edges.length}
      />
      <div className="mt-6 flex items-center gap-4">
        <Link
          to={`/app/review/${scenario.slug}/stress-tests`}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Run Architecture Stress Tests
        </Link>
        <Link to={`/app/review/${scenario.slug}`} className="text-sm font-medium text-slate-300 underline underline-offset-4">
          Return to architecture
        </Link>
      </div>
    </main>
  );
}
