import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { PublicArchitectureScenario, SystemSummary } from "@purgatory/shared";
import { getScenarioBySlug } from "../features/scenarios/api.js";
import { useSelection } from "../features/architecture-review/useSelection.js";
import { ApiError } from "../lib/api/client.js";
import { ArchitectureCanvas } from "../components/architecture/ArchitectureCanvas.js";

export function SystemArchitecturePage() {
  const system = useOutletContext<SystemSummary>();
  const [scenario, setScenario] = useState<PublicArchitectureScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();

  useEffect(() => {
    if (system.sourceType !== "sample") return;
    let cancelled = false;
    getScenarioBySlug(system.slug)
      .then((data) => {
        if (!cancelled) setScenario(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, [system.slug, system.sourceType]);

  if (system.sourceType !== "sample") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">No architecture configured.</p>
        <p className="mt-3 text-xs text-slate-500">Manual architecture editing is coming in a later phase.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
        Couldn't load architecture: {error}
      </div>
    );
  }

  if (!scenario) {
    return <div className="h-96 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />;
  }

  return (
    <div className="h-[600px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <ArchitectureCanvas
        nodes={scenario.nodes}
        edges={scenario.edges}
        selection={selection}
        onSelectNode={selectNode}
        onSelectEdge={selectEdge}
        onClearSelection={clearSelection}
        reviewedNodeIds={new Set()}
        reviewedEdgeIds={new Set()}
        redlineCountByNodeId={{}}
        redlineCountByEdgeId={{}}
      />
    </div>
  );
}
