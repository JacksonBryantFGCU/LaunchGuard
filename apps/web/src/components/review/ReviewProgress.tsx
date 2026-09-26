interface ReviewProgressProps {
  reviewedNodeCount: number;
  totalNodeCount: number;
  reviewedEdgeCount: number;
  totalEdgeCount: number;
  redlineCount: number;
}

// Truthful progress only - never reveals how many hidden risks exist.
export function ReviewProgress({ reviewedNodeCount, totalNodeCount, reviewedEdgeCount, totalEdgeCount, redlineCount }: ReviewProgressProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
      <div className="flex items-baseline gap-1">
        <dt>Components reviewed</dt>
        <dd className="font-medium text-slate-200">
          {reviewedNodeCount} / {totalNodeCount}
        </dd>
      </div>
      <div className="flex items-baseline gap-1">
        <dt>Connections reviewed</dt>
        <dd className="font-medium text-slate-200">
          {reviewedEdgeCount} / {totalEdgeCount}
        </dd>
      </div>
      <div className="flex items-baseline gap-1">
        <dt>Redlines</dt>
        <dd className="font-medium text-slate-200">{redlineCount}</dd>
      </div>
    </dl>
  );
}
