import { Link } from "react-router-dom";
import type { ArchitectureScenarioPreview } from "@redline/shared";
import { Badge } from "../ui/Badge.js";
import { DIFFICULTY_LABELS, FOCUS_LABELS } from "../../features/scenarios/labels.js";

export function ScenarioCard({ scenario }: { scenario: ArchitectureScenarioPreview }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{scenario.title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {DIFFICULTY_LABELS[scenario.difficulty]} · {scenario.focusAreas.map((f) => FOCUS_LABELS[f]).join(" · ")}
          </p>
        </div>
        <Badge>{scenario.reviewCode}</Badge>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{scenario.description}</p>

      <dl className="flex items-center gap-4 text-xs text-slate-500">
        <div>
          <dt className="sr-only">Components</dt>
          <dd>{scenario.nodeCount} components</dd>
        </div>
        <div>
          <dt className="sr-only">Connections</dt>
          <dd>{scenario.edgeCount} connections</dd>
        </div>
      </dl>

      <Link
        to={`/app/practice/${scenario.slug}`}
        className="mt-1 inline-flex w-fit items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
      >
        Start Practice
      </Link>
    </article>
  );
}
