import { Link } from "react-router-dom";
import type { SystemSummary } from "@purgatory/shared";
import { Badge } from "../ui/Badge.js";
import { sourceLabel, isSystemEmpty } from "../../features/systems/grouping.js";

export function SystemCard({ system }: { system: SystemSummary }) {
  return (
    <Link
      to={`/app/systems/${system.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5 hover:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100">{system.name}</h2>
        <Badge>{sourceLabel(system.sourceType)}</Badge>
      </div>

      {system.description && <p className="text-sm leading-relaxed text-slate-300">{system.description}</p>}

      <p className="text-xs text-slate-500">
        {isSystemEmpty(system)
          ? "Architecture not configured"
          : `${system.componentCount} components · ${system.scenarioCount} test scenarios`}
      </p>
    </Link>
  );
}
