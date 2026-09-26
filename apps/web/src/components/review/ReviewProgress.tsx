interface ReviewProgressProps {
  reviewedCount: number;
  totalCount: number;
  commentCount: number;
  hasNotes: boolean;
}

export function ReviewProgress({ reviewedCount, totalCount, commentCount, hasNotes }: ReviewProgressProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-slate-400">
      <div>
        <dt className="sr-only">Files reviewed</dt>
        <dd>
          Files reviewed: <span className="font-medium text-slate-200">{reviewedCount}</span> / {totalCount}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Inline comments</dt>
        <dd>
          Inline comments: <span className="font-medium text-slate-200">{commentCount}</span>
        </dd>
      </div>
      <div>
        <dt className="sr-only">Reviewer notes status</dt>
        <dd>Reviewer notes: <span className="font-medium text-slate-200">{hasNotes ? "Added" : "None"}</span></dd>
      </div>
    </dl>
  );
}
