import type { ScenarioFile } from "@redline/shared";

const STATUS_LABEL: Record<ScenarioFile["status"], string> = {
  added: "A",
  modified: "M",
  removed: "D",
};

interface ChangedFilesListProps {
  files: ScenarioFile[];
  selectedFile: string;
  reviewedFiles: Set<string>;
  commentCounts: Record<string, number>;
  onSelect: (path: string) => void;
}

export function ChangedFilesList({ files, selectedFile, reviewedFiles, commentCounts, onSelect }: ChangedFilesListProps) {
  return (
    <nav aria-label="Changed files" className="flex h-full flex-col overflow-y-auto border-r border-slate-800 bg-slate-950">
      <h2 className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Changed Files
      </h2>
      <ul className="flex-1">
        {files.map((file) => {
          const isSelected = file.path === selectedFile;
          const isReviewed = reviewedFiles.has(file.path);
          const commentCount = commentCounts[file.path] ?? 0;
          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => onSelect(file.path)}
                aria-current={isSelected ? "true" : undefined}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs ${
                  isSelected ? "bg-slate-800 text-slate-100" : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <span aria-hidden="true" className="w-3 shrink-0 font-mono text-slate-500">
                  {STATUS_LABEL[file.status]}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{file.path}</span>
                {commentCount > 0 && (
                  <span className="shrink-0 rounded-full bg-slate-700 px-1.5 text-slate-200" title={`${commentCount} comment(s)`}>
                    {commentCount}
                  </span>
                )}
                <span className="shrink-0 text-emerald-500">+{file.additions}</span>
                <span className="shrink-0 text-red-500">-{file.deletions}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{isReviewed ? "Reviewed" : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
