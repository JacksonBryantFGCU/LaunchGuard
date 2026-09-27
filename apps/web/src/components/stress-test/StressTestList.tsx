import type { StressTestReveal } from "@purgatory/shared";
import type { StressTestRunStatus } from "../../features/stress-test/stressTestState.js";

const STATUS_ICON: Record<StressTestRunStatus, string> = {
  not_started: "○",
  running: "▶",
  passed: "✓",
  failed: "✕",
};

const STATUS_LABEL: Record<StressTestRunStatus, string> = {
  not_started: "Not started",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
};

export function StressTestList({
  tests,
  statuses,
  selectedTestId,
  onSelect,
}: {
  tests: StressTestReveal[];
  statuses: Record<string, StressTestRunStatus>;
  selectedTestId: string | null;
  onSelect: (testId: string) => void;
}) {
  return (
    <nav aria-label="Stress tests" className="scroll-panel flex flex-col gap-1 overflow-y-auto border-r border-slate-800 p-3">
      <h2 className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tests</h2>
      {tests.map((test) => {
        const status = statuses[test.id] ?? "not_started";
        const selected = test.id === selectedTestId;
        return (
          <button
            key={test.id}
            type="button"
            onClick={() => onSelect(test.id)}
            aria-pressed={selected}
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs ${
              selected ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <span aria-hidden="true">{STATUS_ICON[status]}</span>
            <span className="flex-1">{test.name}</span>
            <span className="sr-only">{STATUS_LABEL[status]}</span>
          </button>
        );
      })}
    </nav>
  );
}
