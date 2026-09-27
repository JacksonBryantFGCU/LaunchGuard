import { Link } from "react-router-dom";
import type { PublicArchitectureScenario } from "@purgatory/shared";
import { ReviewProgress } from "../review/ReviewProgress.js";

interface ReviewFooterProps {
  scenario: PublicArchitectureScenario;
  reviewedNodeCount: number;
  reviewedEdgeCount: number;
  redlineCount: number;
  locked: boolean;
  onOpenGuide: () => void;
}

export function ReviewFooter({ scenario, reviewedNodeCount, reviewedEdgeCount, redlineCount, locked, onOpenGuide }: ReviewFooterProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-2">
      <ReviewProgress
        reviewedNodeCount={reviewedNodeCount}
        totalNodeCount={scenario.nodes.length}
        reviewedEdgeCount={reviewedEdgeCount}
        totalEdgeCount={scenario.edges.length}
        redlineCount={redlineCount}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenGuide}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100"
        >
          Review Guide
        </button>
        <Link
          to={`/app/review/${scenario.slug}/${locked ? "submitted" : "submit"}`}
          className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500"
        >
          {locked ? "View Submitted Review" : "Proceed to Review Summary"}
        </Link>
      </div>
    </footer>
  );
}
