import { useNavigate, useOutletContext } from "react-router-dom";
import { usePracticeAttempt } from "../features/practice-scenarios/practiceAttemptStore.js";
import { canOpenResult } from "../features/practice-scenarios/practiceWorkflow.js";
import type { PracticeScenarioOutletContext } from "./PracticeScenarioLayout.js";

export function PracticeScenarioBriefPage() {
  const { system, practiceScenario } = useOutletContext<PracticeScenarioOutletContext>();
  const { view } = usePracticeAttempt();
  const navigate = useNavigate();

  const basePath = `/app/practice/${system.slug}/${practiceScenario.id}`;
  const alreadyInProgress = canOpenResult(view.status);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Scenario {practiceScenario.order} of 5
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-100">{practiceScenario.title}</h1>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situation</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{practiceScenario.situation}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Role</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          You're the engineer responsible for this system. Investigate what's happening and decide how to respond.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Task</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{practiceScenario.objective}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What You Need to Submit</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
          <li>What you think is happening</li>
          <li>What you'd investigate first</li>
          <li>What you'd do immediately</li>
          <li>What architecture change you'd recommend</li>
          <li>What tradeoff your approach introduces</li>
          <li>Severity, and which requirements are affected</li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(alreadyInProgress ? `${basePath}/result` : `${basePath}/investigate`)}
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {alreadyInProgress ? "View Result" : "Begin Investigation"}
        </button>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/investigate?tab=stress-lab`)}
          className="inline-flex items-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
        >
          Open Stress Lab
        </button>
      </div>
    </main>
  );
}
