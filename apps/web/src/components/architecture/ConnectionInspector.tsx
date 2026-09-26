import type { ArchitectureConnectionDetails, ArchitectureEdge, ArchitectureNode } from "@redline/shared";
import { Fact } from "./InspectorFacts.js";

interface ConnectionInspectorProps {
  edge: ArchitectureEdge;
  sourceNode?: ArchitectureNode;
  targetNode?: ArchitectureNode;
  details?: ArchitectureConnectionDetails;
}

export function ConnectionInspector({ edge, sourceNode, targetNode, details }: ConnectionInspectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connection</p>
        <h3 className="text-sm font-semibold text-slate-100">
          {sourceNode?.label ?? edge.source} <span className="text-slate-500">&rarr;</span> {targetNode?.label ?? edge.target}
        </h3>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Fact label="Protocol" value={edge.protocol} />
        <Fact label="Mode" value={edge.mode} />
        {details?.timeout && <Fact label="Timeout" value={details.timeout} />}
        {details?.retryPolicy && <Fact label="Retries" value={details.retryPolicy} />}
        {details?.authentication && <Fact label="Authentication" value={details.authentication} />}
        {details?.payload && <Fact label="Payload" value={details.payload} />}
        {details?.consistency && <Fact label="Consistency" value={details.consistency} />}
      </dl>
    </div>
  );
}
