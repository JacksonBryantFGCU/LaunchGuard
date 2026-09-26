import { useState } from "react";
import { useReviewSessionContext } from "../../features/review/reviewSessionContextInternal.js";
import { ChangedFilesList } from "./ChangedFilesList.js";
import { CodeDiffViewer, type LineSelection } from "./CodeDiffViewer.js";
import { ReviewCommentComposer } from "./ReviewCommentComposer.js";
import { ReviewCommentList } from "./ReviewCommentList.js";
import { ReviewerNotes } from "./ReviewerNotes.js";
import { DeveloperPanel } from "./DeveloperPanel.js";

export function ReviewSession() {
  const { scenario, state, isLocked, commentsForSelectedFile, selectFile, addComment, deleteComment, setNotes } =
    useReviewSessionContext();

  const [liveSelection, setLiveSelection] = useState<LineSelection | null>(null);
  const [composerSelection, setComposerSelection] = useState<LineSelection | null>(null);

  const selectedFile = scenario.files.find((f) => f.path === state.selectedFile) ?? scenario.files[0];

  const commentCounts = scenario.files.reduce<Record<string, number>>((counts, file) => {
    counts[file.path] = state.comments.filter((c) => c.file === file.path).length;
    return counts;
  }, {});

  function handleSelectFile(path: string) {
    selectFile(path);
    setLiveSelection(null);
    setComposerSelection(null);
  }

  function handleAddComment(body: string) {
    if (!composerSelection || !selectedFile) return;
    addComment({
      id: crypto.randomUUID(),
      file: selectedFile.path,
      startLine: composerSelection.startLine,
      endLine: composerSelection.endLine,
      body,
      createdAt: new Date().toISOString(),
    });
    setComposerSelection(null);
  }

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[240px_1fr_280px]">
      <div className="flex h-full flex-col overflow-hidden">
        <ChangedFilesList
          files={scenario.files}
          selectedFile={state.selectedFile}
          reviewedFiles={state.reviewedFiles}
          commentCounts={commentCounts}
          onSelect={handleSelectFile}
        />
      </div>

      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          {selectedFile && (
            <CodeDiffViewer
              key={selectedFile.path}
              file={selectedFile}
              commentedLines={commentsForSelectedFile.map((c) => c.startLine)}
              onSelectionChange={setLiveSelection}
            />
          )}
        </div>

        <div className="max-h-72 shrink-0 overflow-y-auto border-t border-slate-800 bg-slate-900 p-3">
          {!isLocked && liveSelection && !composerSelection && (
            <button
              type="button"
              onClick={() => setComposerSelection(liveSelection)}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Add comment on lines{" "}
              {liveSelection.startLine === liveSelection.endLine
                ? liveSelection.startLine
                : `${liveSelection.startLine}–${liveSelection.endLine}`}
            </button>
          )}

          {!isLocked && composerSelection && selectedFile && (
            <ReviewCommentComposer
              filePath={selectedFile.path}
              startLine={composerSelection.startLine}
              endLine={composerSelection.endLine}
              onSubmit={handleAddComment}
              onCancel={() => setComposerSelection(null)}
            />
          )}

          <div className="mt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comments {selectedFile ? `· ${selectedFile.path}` : ""}
            </h3>
            <ReviewCommentList comments={commentsForSelectedFile} onDelete={deleteComment} readOnly={isLocked} />
          </div>
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <DeveloperPanel />
        <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-4">
          <ReviewerNotes value={state.reviewerNotes} onChange={setNotes} disabled={isLocked} />
        </div>
      </div>
    </div>
  );
}
