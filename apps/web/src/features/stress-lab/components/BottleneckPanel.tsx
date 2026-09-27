import type { SimulationBottleneck } from "@redline/shared";

const SEVERITY_RANK: Record<SimulationBottleneck["severity"], number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function BottleneckPanel({
  bottlenecks,
  onSelect,
}: {
  bottlenecks: SimulationBottleneck[];
  onSelect: (targetType: "node" | "edge", targetId: string) => void;
}) {
  if (bottlenecks.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bottlenecks</h3>
        <p className="mt-2 text-xs text-slate-500">No bottlenecks observed at this point in the run.</p>
      </div>
    );
  }

  const ranked = [...bottlenecks].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bottlenecks</h3>
      <ol className="mt-2 flex flex-col gap-2">
        {ranked.map((b, i) => (
          <li key={`${b.targetType}-${b.targetId}-${b.metric}`}>
            <button
              type="button"
              onClick={() => onSelect(b.targetType, b.targetId)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 p-2.5 text-left hover:border-slate-600"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {i + 1}. {b.targetId}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{b.severity}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {b.metric}: <span className="font-mono">{b.observed}</span> (threshold {b.threshold})
              </p>
              <p className="mt-1 text-xs text-slate-500">{b.explanation}</p>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
