import type { SimulationEdgeState, SimulationNodeState } from "@purgatory/shared";
import { Fact } from "../../../components/architecture/InspectorFacts.js";

const STATE_LABEL: Record<string, string> = {
  normal: "HEALTHY",
  degraded: "DEGRADED",
  saturated: "SATURATED",
  unavailable: "FAILED",
  recovering: "RECOVERING",
  backlogged: "BACKLOGGED",
  timed_out: "TIMED OUT",
};

export function RuntimeNodeInspector({ label, state }: { label: string; state: SimulationNodeState }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status {STATE_LABEL[state.state] ?? state.state}</p>
      </div>
      {Object.keys(state.metrics).length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {Object.entries(state.metrics).map(([k, v]) => (
            <Fact key={k} label={k} value={v} />
          ))}
        </dl>
      )}
      <p className="text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Impact </span>
        {state.explanation}
      </p>
    </div>
  );
}

export function RuntimeEdgeInspector({ label, state }: { label: string; state: SimulationEdgeState }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status {STATE_LABEL[state.state] ?? state.state}</p>
      </div>
      {Object.keys(state.metrics).length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {Object.entries(state.metrics).map(([k, v]) => (
            <Fact key={k} label={k} value={v} />
          ))}
        </dl>
      )}
      <p className="text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Impact </span>
        {state.explanation}
      </p>
    </div>
  );
}
