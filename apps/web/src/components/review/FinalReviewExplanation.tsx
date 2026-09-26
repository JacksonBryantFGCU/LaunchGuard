import { FINAL_EXPLANATION_MAX_LENGTH, FINAL_EXPLANATION_MIN_LENGTH } from "@redline/shared";

interface FinalReviewExplanationProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FinalReviewExplanation({ value, onChange, disabled }: FinalReviewExplanationProps) {
  const tooShort = value.trim().length > 0 && value.trim().length < FINAL_EXPLANATION_MIN_LENGTH;

  return (
    <div>
      <label htmlFor="final-explanation" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Final Review Explanation
      </label>
      <textarea
        id="final-explanation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        maxLength={FINAL_EXPLANATION_MAX_LENGTH}
        aria-describedby="final-explanation-hint"
        placeholder="Summarize the rationale behind your review decision…"
        className="mt-1 w-full resize-y rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
      />
      <p id="final-explanation-hint" className="mt-1 text-xs text-slate-500">
        {tooShort
          ? `At least ${FINAL_EXPLANATION_MIN_LENGTH} characters required.`
          : `${value.length} / ${FINAL_EXPLANATION_MAX_LENGTH} characters`}
      </p>
    </div>
  );
}
