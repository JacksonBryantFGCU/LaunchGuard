import type { PublicArchitectureScenario } from "@redline/shared";

interface ReviewInstructionsProps {
  scenario: PublicArchitectureScenario;
  onDismiss: () => void;
  dismissLabel: string;
}

export function ReviewInstructions({ scenario, onDismiss, dismissLabel }: ReviewInstructionsProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-instructions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
    >
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h2 id="review-instructions-title" className="text-base font-semibold text-slate-100">
          Architecture Review Brief
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {scenario.title} · {scenario.reviewCode}
        </p>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Role</h3>
          <p className="mt-1 text-sm text-slate-300">{scenario.reviewerRole}</p>
        </section>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Goal</h3>
          <p className="mt-1 text-sm text-slate-300">{scenario.learningObjective}</p>
        </section>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to Review</h3>
          <ol className="mt-1 list-inside list-decimal text-sm text-slate-300">
            {scenario.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Output</h3>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
            {scenario.expectedDeliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
