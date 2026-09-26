interface ReviewerNotesProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ReviewerNotes({ value, onChange, disabled }: ReviewerNotesProps) {
  return (
    <div>
      <label htmlFor="reviewer-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Reviewer Notes
      </label>
      <textarea
        id="reviewer-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Freeform observations while you investigate…"
        className="mt-1 w-full resize-y rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
      />
    </div>
  );
}
