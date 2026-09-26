interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

// Separate from ReviewerNotes: this is the formal submitted conclusion, not working thoughts.
export function FinalReviewRationale({ value, onChange, disabled, error }: Props) {
  return (
    <div>
      <label htmlFor="final-rationale" className="text-xs font-medium text-slate-400">
        Final Review Rationale
      </label>
      <textarea
        id="final-rationale"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={5000}
        rows={6}
        placeholder="The architecture requires redesign before implementation. The synchronous payment dependency and database topology create availability risks that conflict with the stated SLOs..."
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "final-rationale-error" : undefined}
        className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-60"
      />
      {error && (
        <p id="final-rationale-error" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
