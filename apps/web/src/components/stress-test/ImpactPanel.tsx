import type { PublicArchitectureScenario, RequirementImpactStatus, StressTestReveal, StressTestStepReveal } from "@purgatory/shared";

const STATUS_LABEL: Record<RequirementImpactStatus, string> = {
  met: "✓ Met",
  at_risk: "△ At risk",
  violated: "✕ Violated",
};

export function ImpactPanel({
  scenario,
  test,
  step,
  isComplete,
}: {
  scenario: PublicArchitectureScenario;
  test: StressTestReveal | null;
  step: StressTestStepReveal | null;
  isComplete: boolean;
}) {
  if (!test) {
    return (
      <aside className="scroll-panel overflow-y-auto border-l border-slate-800 p-4 text-xs text-slate-500">
        Impact details appear here once a test is running.
      </aside>
    );
  }

  const requirementLabel = (id: string) => scenario.requirements.find((r) => r.id === id)?.summary ?? id;

  return (
    <aside className="scroll-panel flex flex-col gap-4 overflow-y-auto border-l border-slate-800 p-4">
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Trigger</h2>
        <p className="mt-1 text-xs text-slate-300">{test.trigger}</p>
      </div>

      {step && (
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">System effect</h2>
          <p className="mt-1 text-xs text-slate-300">{step.description}</p>

          {step.requirementImpacts.length > 0 && (
            <div className="mt-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Requirement impact</h3>
              <ul className="mt-1 flex flex-col gap-2">
                {step.requirementImpacts.map((impact) => (
                  <li key={impact.requirementId} className="text-xs text-slate-400">
                    <p className="font-medium text-slate-200">
                      {requirementLabel(impact.requirementId)} — {STATUS_LABEL[impact.status]}
                      {impact.observedValue ? ` (${impact.observedValue})` : ""}
                    </p>
                    <p className="text-slate-500">{impact.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isComplete && (
        <div className="border-t border-slate-800 pt-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Why this happened</h2>
          <p className="mt-1 text-xs text-slate-300">{test.explanation}</p>
          <p className="mt-2 text-xs font-semibold text-slate-200">Result: {test.status === "pass" ? "Passed" : "Failed"}</p>
        </div>
      )}
    </aside>
  );
}
