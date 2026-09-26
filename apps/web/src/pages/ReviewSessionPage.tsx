import { Link } from "react-router-dom";
import { useReviewSessionContext } from "../features/review/reviewSessionContextInternal.js";
import { ReviewSession } from "../components/review/ReviewSession.js";
import { ReviewProgress } from "../components/review/ReviewProgress.js";

export function ReviewSessionPage() {
  const { scenario, state, isLocked } = useReviewSessionContext();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <ReviewSession />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-2 py-2">
        <ReviewProgress
          reviewedCount={state.reviewedFiles.size}
          totalCount={scenario.files.length}
          commentCount={state.comments.length}
          hasNotes={state.reviewerNotes.trim().length > 0}
        />
        {isLocked ? (
          <Link
            to={`/review/${scenario.slug}/submitted`}
            className="mr-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white"
          >
            View submitted review
          </Link>
        ) : (
          <Link
            to={`/review/${scenario.slug}/submit`}
            className="mr-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white"
          >
            Submit Review
          </Link>
        )}
      </footer>
    </div>
  );
}
