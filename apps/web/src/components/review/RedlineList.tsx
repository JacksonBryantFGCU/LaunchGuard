import type { Redline } from "@purgatory/shared";
import { Badge } from "../ui/Badge.js";
import { RISK_CATEGORY_LABELS, SEVERITY_LABELS } from "../../features/scenarios/labels.js";

const SEVERITY_TONE: Record<Redline["severity"], "danger" | "warning" | "neutral"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

interface RedlineListProps {
  redlines: Redline[];
  targetLabel: (redline: Redline) => string;
  onSelectTarget: (redline: Redline) => void;
  onEdit: (redline: Redline) => void;
  onDelete: (redline: Redline) => void;
  readOnly?: boolean;
}

export function RedlineList({ redlines, targetLabel, onSelectTarget, onEdit, onDelete, readOnly }: RedlineListProps) {
  if (redlines.length === 0) {
    return <p className="text-xs text-slate-500">No redlines yet. Select a component or connection to add one.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Redlines">
      {redlines.map((redline) => (
        <li key={redline.id} className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
          <div className="flex items-center gap-2">
            <Badge tone={SEVERITY_TONE[redline.severity]}>{SEVERITY_LABELS[redline.severity]}</Badge>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {RISK_CATEGORY_LABELS[redline.category]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTarget(redline)}
            className="mt-1.5 block text-left text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {targetLabel(redline)}
          </button>
          <p className="mt-1 text-sm text-slate-200">{redline.title}</p>
          <p className="mt-1 text-xs text-slate-400">{redline.reasoning}</p>
          {!readOnly && (
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => onEdit(redline)} className="text-xs font-medium text-slate-400 hover:text-slate-200">
                Edit
              </button>
              <button type="button" onClick={() => onDelete(redline)} className="text-xs font-medium text-red-400 hover:text-red-300">
                Delete
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
