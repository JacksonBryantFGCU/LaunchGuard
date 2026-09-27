import type { ArchitectureComponentDetails, ArchitectureNode } from "@purgatory/shared";
import { NODE_CATEGORY_LABELS } from "../../features/scenarios/labels.js";
import { Fact, FactList } from "./InspectorFacts.js";

export function ComponentInspector({ node, details }: { node: ArchitectureNode; details?: ArchitectureComponentDetails }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{NODE_CATEGORY_LABELS[node.category]}</p>
        <h3 className="text-sm font-semibold text-slate-100">{node.label}</h3>
        <p className="mt-1 text-xs text-slate-400">{node.summary}</p>
      </div>

      {details && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {details.runtime && <Fact label="Runtime" value={details.runtime} />}
          {details.instances !== undefined && <Fact label="Instances" value={String(details.instances)} />}
          {details.region && <Fact label="Region" value={details.region} />}
          {details.scalingPolicy && <Fact label="Scaling" value={details.scalingPolicy} />}
        </dl>
      )}

      {details && details.responsibilities.length > 0 && <FactList label="Responsibilities" items={details.responsibilities} />}
      {details && details.dependencies.length > 0 && <FactList label="Dependencies" items={details.dependencies} />}
      {details && details.dataOwned.length > 0 && <FactList label="Data Owned" items={details.dataOwned} />}
    </div>
  );
}
