import { useState } from "react";
import type { AddComponentModification, ArchitectureEdge, ArchitectureNode, InterventionDefinition } from "@purgatory/shared";
import { addIntervention, removeIntervention } from "../interventionEditor.js";

// Minimal "Modify Architecture" editor (spec #33/#34): not a drag-and-drop
// palette - pick an intervention from the backend's palette, pick a valid
// target, add it. No architecture-editing system existed before this, so
// this is deliberately small: a list, not a canvas-based builder.
export function InterventionEditorPanel({
  interventions,
  nodes,
  edges,
  modifications,
  onChange,
  testLabel,
  baselinePassed,
}: {
  interventions: InterventionDefinition[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  modifications: AddComponentModification[];
  onChange: (mods: AddComponentModification[]) => void;
  testLabel: string | undefined;
  baselinePassed: boolean | undefined;
}) {
  const [pendingInterventionType, setPendingInterventionType] = useState<string>(interventions[0]?.componentType ?? "");
  const [pendingTargetKey, setPendingTargetKey] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);

  const pendingIntervention = interventions.find((i) => i.componentType === pendingInterventionType);
  const labelForTarget = (key: string): string => {
    const [kind, id] = key.split(":", 2) as ["node" | "edge", string];
    if (kind === "node") return nodes.find((n) => n.id === id)?.label ?? id;
    const edge = edges.find((e) => e.id === id);
    if (!edge) return id;
    return `${nodes.find((n) => n.id === edge.source)?.label ?? edge.source} -> ${nodes.find((n) => n.id === edge.target)?.label ?? edge.target}`;
  };

  function handleAdd() {
    if (!pendingIntervention || !pendingTargetKey) return;
    const [kind, id] = pendingTargetKey.split(":", 2) as ["node" | "edge", string];
    const target = kind === "node" ? { nodeId: id } : { edgeId: id };
    const result = addIntervention(modifications, pendingIntervention, target);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(undefined);
    onChange(result.modifications);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Modify Architecture</h1>
        {testLabel && (
          <div className="mt-2 rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
            <p className="font-semibold uppercase tracking-wide text-slate-500">Current Test</p>
            <p className="mt-1 text-sm text-slate-200">{testLabel}</p>
            {baselinePassed !== undefined && <p className={`mt-1 ${baselinePassed ? "text-emerald-400" : "text-red-400"}`}>Baseline {baselinePassed ? "PASSED" : "FAILED"}</p>}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Design Changes</h2>
        {modifications.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No changes yet - the design matches the scenario baseline.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {modifications.map((mod) => (
              <li key={mod.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
                <span className="text-slate-200">
                  {interventions.find((i) => i.componentType === mod.componentType)?.label ?? mod.componentType} on{" "}
                  {labelForTarget(mod.targetNodeId ? `node:${mod.targetNodeId}` : `edge:${mod.targetEdgeId}`)}
                </span>
                <button type="button" onClick={() => onChange(removeIntervention(modifications, mod.id))} className="text-red-400 hover:text-red-300">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add a Component</h2>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Intervention
            <select
              value={pendingInterventionType}
              onChange={(e) => {
                setPendingInterventionType(e.target.value);
                setPendingTargetKey("");
              }}
              className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"
            >
              {interventions.map((i) => (
                <option key={i.componentType} value={i.componentType}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          {pendingIntervention && <p className="text-xs text-slate-500">{pendingIntervention.purpose}</p>}
          {pendingIntervention && (
            <p className="text-[11px] text-slate-600">
              Tradeoff: {pendingIntervention.tradeoff.tradeoff} (complexity: {pendingIntervention.tradeoff.operationalComplexity}, cost: {pendingIntervention.tradeoff.costImpact})
            </p>
          )}

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Target
            <select value={pendingTargetKey} onChange={(e) => setPendingTargetKey(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100">
              <option value="">Select a target</option>
              {pendingIntervention?.validTargets.map((t) => {
                const key = t.nodeId ? `node:${t.nodeId}` : `edge:${t.edgeId}`;
                return (
                  <option key={key} value={key}>
                    {labelForTarget(key)}
                  </option>
                );
              })}
            </select>
          </label>

          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!pendingIntervention || !pendingTargetKey}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Add to Design
          </button>
        </div>
      </div>
    </div>
  );
}
