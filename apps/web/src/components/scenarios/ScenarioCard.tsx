import { Link } from "react-router-dom";
import type { ScenarioPreview } from "@redline/shared";
import { Badge } from "../ui/Badge.js";
import { CATEGORY_LABELS, CI_STATUS_LABELS, CI_STATUS_TONE, DIFFICULTY_LABELS } from "../../features/scenarios/labels.js";

export function ScenarioCard({ scenario }: { scenario: ScenarioPreview }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{scenario.title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {DIFFICULTY_LABELS[scenario.difficulty]} · {scenario.categories.map((c) => CATEGORY_LABELS[c]).join(" · ")}
          </p>
        </div>
        <Badge tone={CI_STATUS_TONE[scenario.ciStatus]}>{CI_STATUS_LABELS[scenario.ciStatus]}</Badge>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{scenario.description}</p>

      <dl className="flex items-center gap-4 text-xs text-slate-500">
        <div>
          <dt className="sr-only">Pull request</dt>
          <dd>PR #{scenario.prNumber}</dd>
        </div>
        <div>
          <dt className="sr-only">Files changed</dt>
          <dd>{scenario.filesChanged} files</dd>
        </div>
        <div>
          <dt className="sr-only">Additions</dt>
          <dd className="text-emerald-500">+{scenario.additions}</dd>
        </div>
        <div>
          <dt className="sr-only">Deletions</dt>
          <dd className="text-red-500">-{scenario.deletions}</dd>
        </div>
      </dl>

      <Link
        to={`/review/${scenario.slug}`}
        className="mt-1 inline-flex w-fit items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
      >
        Start Review
      </Link>
    </article>
  );
}
