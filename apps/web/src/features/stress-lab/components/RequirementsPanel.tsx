import type { SimulationRequirementResult } from "@redline/shared";

const STATUS_LABEL: Record<SimulationRequirementResult["status"], string> = { met: "PASS", at_risk: "AT RISK", violated: "FAIL" };
const STATUS_CLASS: Record<SimulationRequirementResult["status"], string> = {
  met: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
  at_risk: "border-amber-900 bg-amber-950/40 text-amber-300",
  violated: "border-red-900 bg-red-950/40 text-red-300",
};

export function RequirementsPanel({
  requirements,
  labelsById,
}: {
  requirements: SimulationRequirementResult[];
  labelsById: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
      <p className="mt-1 text-[11px] text-slate-600">Reflects the worst state observed during the run.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {requirements.map((req) => (
          <li key={req.requirementId} className={`rounded-md border px-3 py-2 text-xs ${STATUS_CLASS[req.status]}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold tracking-wide">{STATUS_LABEL[req.status]}</span>
              {req.observedValue && <span className="font-mono text-[11px] opacity-80">{req.observedValue}</span>}
            </div>
            <p className="mt-1 font-medium text-slate-200">{labelsById[req.requirementId] ?? req.requirementId}</p>
            <p className="mt-0.5 text-slate-400">{req.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
