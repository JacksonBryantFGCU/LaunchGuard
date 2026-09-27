import type { StressProfile, StressTestCategory } from "@purgatory/shared";

const CATEGORY_LABELS: Partial<Record<StressTestCategory, string>> = {
  load: "LOAD",
  spike: "SPIKE",
  dependency_degradation: "DEPENDENCY",
  resource_saturation: "RESOURCE",
  regional_failure: "FAILURE",
};

export function TestSelector({
  tests,
  selectedTestId,
  onSelect,
}: {
  tests: StressProfile[];
  selectedTestId: string | undefined;
  onSelect: (testId: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Stress tests" className="flex flex-col gap-2">
      {tests.map((test) => {
        const selected = test.id === selectedTestId;
        return (
          <button
            key={test.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(test.id)}
            className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
              selected ? "border-sky-500 bg-sky-950/40" : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] font-semibold tracking-wide text-slate-500">{CATEGORY_LABELS[test.category] ?? test.category.toUpperCase()}</span>
            <span className="text-sm font-semibold text-slate-100">{test.label}</span>
            <span className="text-xs leading-snug text-slate-400">{test.description}</span>
            <span className="mt-1 text-[10px] text-slate-500">~{Math.round(test.durationSeconds / 60) || 1} min simulated</span>
          </button>
        );
      })}
    </div>
  );
}
