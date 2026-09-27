import type { SimulationBottleneck, SimulationRequirementResult } from "@purgatory/shared";
import { correlateRequirementBottleneck } from "../resultSummary.js";

const STATUS_LABEL: Record<SimulationRequirementResult["status"], string> = { met: "PASS", at_risk: "AT RISK", violated: "FAIL" };
const STATUS_CLASS: Record<SimulationRequirementResult["status"], string> = {
  met: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
  at_risk: "border-amber-900 bg-amber-950/40 text-amber-300",
  violated: "border-red-900 bg-red-950/40 text-red-300",
};

export function RequirementsPanel({
  requirements,
  labelsById,
  bottlenecks = [],
  selectedRequirementId,
  onSelect,
}: {
  requirements: SimulationRequirementResult[];
  labelsById: Record<string, string>;
  // When provided, each requirement becomes clickable and (spec #3/#9) shows
  // the best-available causal chain to the bottleneck that likely caused it
  // - correlated only by textual overlap already in the result data, never a
  // fabricated link. Both optional so callers outside an active run (none
  // exist today) keep the old read-only rendering.
  bottlenecks?: SimulationBottleneck[];
  selectedRequirementId?: string;
  onSelect?: (requirementId: string, bottleneck: SimulationBottleneck | undefined) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
      <p className="mt-1 text-[11px] text-slate-600">Reflects the worst state observed during the run.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {requirements.map((req) => {
          const correlated = onSelect ? correlateRequirementBottleneck(req, bottlenecks) : undefined;
          const isSelected = selectedRequirementId === req.requirementId;
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold tracking-wide">{STATUS_LABEL[req.status]}</span>
                {req.observedValue && <span className="font-mono text-[11px] opacity-80">{req.observedValue}</span>}
              </div>
              <p className="mt-1 font-medium text-slate-200">{labelsById[req.requirementId] ?? req.requirementId}</p>
              <p className="mt-0.5 text-slate-400">{req.explanation}</p>
              {correlated && (
                <p className="mt-1.5 border-t border-current/20 pt-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wide">Likely cause: </span>
                  {[...correlated.causalChain, correlated.targetId].join(" → ")}
                </p>
              )}
            </>
          );
          return (
            <li key={req.requirementId}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(req.requirementId, correlated)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-shadow ${STATUS_CLASS[req.status]} ${isSelected ? "ring-2 ring-sky-400" : ""}`}
                >
                  {body}
                </button>
              ) : (
                <div className={`rounded-md border px-3 py-2 text-xs ${STATUS_CLASS[req.status]}`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
