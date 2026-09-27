import { useNavigate, useOutletContext } from "react-router-dom";
import type { ConceptCheck } from "@redline/shared";
import { usePracticeAttempt } from "../features/practice-scenarios/practiceAttemptStore.js";
import { canOpenConsequence, canOpenResult } from "../features/practice-scenarios/practiceWorkflow.js";
import type { PracticeScenarioOutletContext } from "./PracticeScenarioLayout.js";

function ConceptList({ title, tone, checks }: { title: string; tone: "success" | "warning"; checks: ConceptCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.id} className="text-sm">
            <p className={tone === "success" ? "text-emerald-400" : "text-amber-400"}>
              {tone === "success" ? "✓" : "✕"} {check.label}
            </p>
            {tone === "warning" && <p className="mt-0.5 text-xs text-slate-500">Why this matters: {check.teaching}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PracticeResultPage() {
  const { system, practiceScenario } = useOutletContext<PracticeScenarioOutletContext>();
  const { view, markConsequenceReady } = usePracticeAttempt();
  const navigate = useNavigate();

  if (!canOpenResult(view.status) || !view.result) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-slate-400">Submit your response to see the result for this scenario.</p>
      </main>
    );
  }

  const result = view.result;
  const allConcepts = [...result.diagnosisConcepts, ...result.immediateActionConcepts, ...result.architectureDecisionConcepts];
  const strong = allConcepts.filter((c) => c.matched);
  const missed = allConcepts.filter((c) => !c.matched);

  const requirementLabel = (id: string) => system.requirements.find((r) => r.id === id)?.summary ?? id;

  async function handleSeeConsequence() {
    if (view.status === "feedback_ready") await markConsequenceReady();
    navigate(
      `/app/review/${system.slug}/stress-tests?reviewId=${encodeURIComponent(view.reviewSessionId)}` +
        `&practiceScenarioId=${encodeURIComponent(practiceScenario.id)}&title=${encodeURIComponent(practiceScenario.title)}`,
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario Result</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-100">{practiceScenario.title}</h1>

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Response</h2>
        <dl className="mt-2 flex flex-col gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Diagnosis</dt>
            <dd className="text-slate-200">{view.response.diagnosis}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Immediate action</dt>
            <dd className="text-slate-200">{view.response.immediateAction}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Architecture decision</dt>
            <dd className="text-slate-200">{view.response.architectureDecision}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tradeoff</dt>
            <dd className="text-slate-200">{view.response.tradeoff}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objective Score</p>
        <p className="mt-1 text-2xl font-semibold text-slate-100">
          {result.objectiveScore} / {result.maxObjectiveScore}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
            <dt className="text-xs text-slate-500">Diagnosis</dt>
            <dd className="text-slate-200">{result.diagnosisScore} / 6</dd>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
            <dt className="text-xs text-slate-500">Evidence &amp; Requirements</dt>
            <dd className="text-slate-200">{result.evidenceRequirementScore} / 4</dd>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
            <dt className="text-xs text-slate-500">Immediate Response</dt>
            <dd className="text-slate-200">{result.immediateActionScore} / 3</dd>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
            <dt className="text-xs text-slate-500">Architecture Decision</dt>
            <dd className="text-slate-200">{result.architectureDecisionScore} / 3</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 flex flex-col gap-4">
        <ConceptList title="What You Did Well" tone="success" checks={strong} />
        <ConceptList title="What You Missed" tone="warning" checks={missed} />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-100">Affected Requirements</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {result.matchedRequirementIds.map((id) => (
            <li key={id} className="text-emerald-400">
              ✓ {requirementLabel(id)}
            </li>
          ))}
          {result.missedRequirementIds.map((id) => (
            <li key={id} className="text-amber-400">
              ✕ {requirementLabel(id)}
            </li>
          ))}
        </ul>
      </section>

      {!result.severityAligned && (
        <p className="mt-4 text-xs text-slate-500">
          You marked this severity as {result.submittedSeverity}. This situation was closer to {result.expectedSeverity}.
        </p>
      )}

      {canOpenConsequence(view.status) && (
        <button
          type="button"
          onClick={handleSeeConsequence}
          className="mt-8 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          See What Happens
        </button>
      )}
    </main>
  );
}
