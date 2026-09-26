import { useEffect, useRef, useState } from "react";

const MAX_COMMENT_LENGTH = 2000;

interface ReviewCommentComposerProps {
  filePath: string;
  startLine: number;
  endLine: number;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function ReviewCommentComposer({ filePath, startLine, endLine, onSubmit, onCancel }: ReviewCommentComposerProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_COMMENT_LENGTH;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-slate-700 bg-slate-900 p-3">
      <p className="font-mono text-xs text-slate-400">
        {filePath} · Lines {startLine === endLine ? startLine : `${startLine}–${endLine}`}
      </p>
      <label htmlFor="review-comment-body" className="sr-only">
        Review comment
      </label>
      <textarea
        id="review-comment-body"
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        rows={3}
        placeholder="Leave a comment on this line range…"
        className="mt-2 w-full resize-y rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add comment
        </button>
      </div>
    </form>
  );
}
