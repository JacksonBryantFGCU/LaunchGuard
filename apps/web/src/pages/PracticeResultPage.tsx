import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import type { ConceptCheck } from "@redline/shared";
import { usePracticeAttempt } from "../features/practice-scenarios/practiceAttemptStore.js";
import { canOpenConsequence, canOpenResult } from "../features/practice-scenarios/practiceWorkflow.js";
import { buildMockAttemptView, type MockResultPreset } from "../features/practice-scenarios/devMockResult.js";
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
  const { view: liveView, markConsequenceReady, complete } = usePracticeAttempt();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Dev-only shortcut (?mock=pass|fail): preview this page's full layout
  // without running through investigation -> Stress Lab -> submission each
  // time. Never reachable in production - import.meta.env.DEV is false in
  // a built app, so this branch is inert there even if someone appends the
  // param by hand.
  const mockPreset = import.meta.env.DEV ? (searchParams.get("mock") as MockResultPreset | null) : null;
  const view = mockPreset ? buildMockAttemptView(practiceScenario.id, liveView.reviewSessionId, mockPreset) : liveView;

  if (!canOpenResult(view.status) || !view.result) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-slate-400">Submit your response to see the result for this scenario.</p>
        {import.meta.env.DEV && (
          <p className="mt-4 text-xs text-slate-600">
            Dev preview:{" "}
            <Link to="?mock=pass" className="underline">
              pass
            </Link>{" "}
            ·{" "}
            <Link to="?mock=fail" className="underline">
              fail
            </Link>
          </p>
        )}
      </main>
    );
  }

  const result = view.result;
  const allConcepts = [...result.diagnosisConcepts, ...result.immediateActionConcepts, ...result.architectureDecisionConcepts];
  const strong = allConcepts.filter((c) => c.matched);
  const missed = allConcepts.filter((c) => !c.matched);

  const requirementLabel = (id: string) => system.requirements.find((r) => r.id === id)?.summary ?? id;

  // The "what happens" consequence already played out during investigation
  // (Stress Lab, scored above) rather than as a separate narrative reveal
  // after the fact - finishing here just records the attempt as done.
  // consequence_ready is still a required stop in the server's status state
  // machine (feedback_ready -> consequence_ready -> completed), so it's
  // still called, just without a page of its own for practice scenarios.
  async function handleFinish() {
    if (view.status === "feedback_ready") await markConsequenceReady();
    await complete();
    navigate(`/app/practice/${system.slug}`);
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

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Score</p>
        <p className="mt-1 text-3xl font-semibold text-slate-100">
          {result.totalScore} / {result.maxTotalScore}
        </p>
        <p className="mt-1 text-xs text-slate-500">Written response + system resilience under load.</p>
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Written Response ({result.objectiveScore} / {result.maxObjectiveScore})</p>
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

      {/* Absent (maxResilienceScore 0) for a scenario with no Stress Lab - never shown as "0/0", which would read as a failure. */}
      {result.maxResilienceScore > 0 && (
        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            System Resilience ({result.resilienceScore} / {result.maxResilienceScore})
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Credit for each Stress Lab test passed at its default load before submitting - a run made easier by weakening the test doesn't count.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {result.resilienceTestResults.map((test) => (
              <li
                key={test.testId}
                className={`flex items-center justify-between rounded-md border p-2.5 text-sm ${
                  test.passedAtDefaultParameters ? "border-emerald-900 bg-emerald-950/20" : "border-slate-800 bg-slate-900"
                }`}
              >
                <span className="text-slate-200">{test.label}</span>
                <span className={test.passedAtDefaultParameters ? "text-emerald-400" : "text-amber-400"}>
                  {test.passedAtDefaultParameters ? "✓ Passed" : "✕ Not passed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {mockPreset ? (
        <p className="mt-8 text-xs text-slate-600">Dev preview ({mockPreset}) - not a real attempt, nothing is saved.</p>
      ) : view.status === "completed" ? (
        <p className="mt-8 text-sm text-slate-400">
          Scenario completed - this score is recorded.{" "}
          <Link to={`/app/practice/${system.slug}`} className="underline underline-offset-4">
            Back to scenario list
          </Link>
        </p>
      ) : (
        canOpenConsequence(view.status) && (
          <button
            type="button"
            onClick={handleFinish}
            className="mt-8 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Finish Scenario
          </button>
        )
      )}
    </main>
  );
}
