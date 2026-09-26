import type { PublicReviewScenario } from "@redline/shared";
import { Badge } from "../ui/Badge.js";
import { CI_STATUS_LABELS, CI_STATUS_TONE } from "../../features/scenarios/labels.js";

export function PullRequestHeader({ scenario }: { scenario: PublicReviewScenario }) {
  const pr = scenario.pullRequest;
  return (
    <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-slate-100">
          {pr.title} <span className="font-normal text-slate-500">#{pr.number}</span>
        </h1>
        <Badge tone={CI_STATUS_TONE[pr.ciStatus]}>{CI_STATUS_LABELS[pr.ciStatus]}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-400">{pr.description}</p>
      <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <div>
          <dt className="sr-only">Author</dt>
          <dd>by {pr.author}</dd>
        </div>
        <div>
          <dt className="sr-only">Branches</dt>
          <dd>
            <code className="text-slate-300">{pr.sourceBranch}</code> → <code className="text-slate-300">{pr.targetBranch}</code>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Files changed</dt>
          <dd>{scenario.files.length} files changed</dd>
        </div>
        <div>
          <dt className="sr-only">Additions and deletions</dt>
          <dd>
            <span className="text-emerald-500">+{pr.additions}</span> <span className="text-red-500">-{pr.deletions}</span>
          </dd>
        </div>
      </dl>
    </header>
  );
}
