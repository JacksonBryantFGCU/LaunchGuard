import type { ArchitectureRecommendation } from "@purgatory/shared";
import {
  RECOMMENDATION_DESCRIPTIONS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_ORDER,
} from "../../features/architecture-review/recommendationLabels.js";

interface Props {
  value: ArchitectureRecommendation | null;
  onChange: (value: ArchitectureRecommendation) => void;
  disabled?: boolean;
  error?: string;
}

export function ArchitectureRecommendationSelector({ value, onChange, disabled, error }: Props) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-slate-400">Architecture Recommendation</legend>
      <div role="radiogroup" aria-label="Architecture recommendation" className="mt-2 flex flex-col gap-2">
        {RECOMMENDATION_ORDER.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2 ${
              value === option ? "border-sky-500 bg-sky-950/40" : "border-slate-700 bg-slate-950"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="recommendation"
                value={option}
                checked={value === option}
                disabled={disabled}
                onChange={() => onChange(option)}
                className="h-3.5 w-3.5"
              />
              <span className="text-sm font-medium text-slate-100">{RECOMMENDATION_LABELS[option]}</span>
            </span>
            <span className="pl-5 text-xs text-slate-400">{RECOMMENDATION_DESCRIPTIONS[option]}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </fieldset>
  );
}
