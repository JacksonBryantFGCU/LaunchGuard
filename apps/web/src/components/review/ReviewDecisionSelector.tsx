import type { ReviewDecision } from "@redline/shared";
import { REVIEW_DECISIONS, DECISION_LABELS, DECISION_DESCRIPTIONS } from "../../features/review/decisions.js";

interface ReviewDecisionSelectorProps {
  value: ReviewDecision | null;
  onChange: (decision: ReviewDecision) => void;
  disabled?: boolean;
}

export function ReviewDecisionSelector({ value, onChange, disabled }: ReviewDecisionSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Final review decision" className="grid gap-2 sm:grid-cols-2">
      {REVIEW_DECISIONS.map((decision) => {
        const isSelected = value === decision;
        return (
          <label
            key={decision}
            className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors ${
              isSelected ? "border-sky-500 bg-sky-950/30" : "border-slate-800 bg-slate-900 hover:border-slate-700"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="flex items-center gap-2 font-medium text-slate-100">
              <input
                type="radio"
                name="review-decision"
                value={decision}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(decision)}
                className="h-3.5 w-3.5"
              />
              {DECISION_LABELS[decision]}
            </span>
            <span className="text-xs text-slate-400">{DECISION_DESCRIPTIONS[decision]}</span>
          </label>
        );
      })}
    </div>
  );
}
