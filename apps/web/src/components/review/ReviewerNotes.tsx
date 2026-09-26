export function ReviewerNotes({
  notes,
  onChange,
  disabled,
}: {
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <label htmlFor="reviewer-notes" className="text-xs font-medium text-slate-400">
        Unresolved questions, tradeoffs, and observations
      </label>
      <textarea
        id="reviewer-notes"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. What happens if the payment provider is slow during the peak window?"
        className="min-h-40 flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-60"
      />
    </div>
  );
}
