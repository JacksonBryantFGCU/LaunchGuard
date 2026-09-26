export function MarkReviewedControl({
  reviewed,
  locked,
  onMarkReviewed,
}: {
  reviewed: boolean;
  locked?: boolean;
  onMarkReviewed: () => void;
}) {
  if (reviewed) {
    return <p className="text-xs font-medium text-emerald-400">✓ Reviewed</p>;
  }

  if (locked) {
    return <p className="text-xs font-medium text-slate-500">Not reviewed</p>;
  }

  return (
    <button
      type="button"
      onClick={onMarkReviewed}
      className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100"
    >
      Mark Reviewed
    </button>
  );
}
