import type { StressTestReveal } from "@redline/shared";

export function EventTimeline({
  test,
  currentStepIndex,
  isPlaying,
  onTogglePlay,
  onNext,
  onRestart,
}: {
  test: StressTestReveal | null;
  currentStepIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  if (!test) {
    return <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">Select a stress test to begin.</div>;
  }

  const isLastStep = currentStepIndex >= test.steps.length - 1;

  return (
    <div className="border-t border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-500"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isLastStep}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 disabled:opacity-40"
          >
            Next Step
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300"
          >
            Restart
          </button>
        </div>
        <p aria-live="polite" className="text-xs text-slate-500">
          Event {currentStepIndex + 1} / {test.steps.length}
        </p>
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {test.steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={index === currentStepIndex ? "step" : undefined}
            className={`rounded-md border px-3 py-2 text-xs ${
              index === currentStepIndex ? "border-sky-600 bg-slate-900 text-slate-100" : "border-slate-800 text-slate-500"
            }`}
          >
            <span className="font-semibold">{step.title}</span>
            <span className="ml-2">{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
