import type { ReviewComment } from "../../features/review/types.js";

interface ReviewCommentListProps {
  comments: ReviewComment[];
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function ReviewCommentList({ comments, onDelete, readOnly }: ReviewCommentListProps) {
  if (comments.length === 0) {
    return <p className="text-xs text-slate-500">No comments on this file yet. Select a line to add one.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-md border border-slate-800 bg-slate-950 p-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-xs text-slate-500">
              Lines {comment.startLine === comment.endLine ? comment.startLine : `${comment.startLine}–${comment.endLine}`}
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                aria-label={`Delete comment on lines ${comment.startLine} to ${comment.endLine}`}
                className="text-xs text-slate-500 hover:text-red-400"
              >
                Delete
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}
