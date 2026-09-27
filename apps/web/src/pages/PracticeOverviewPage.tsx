import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { listPracticeScenarios, listPracticeScenarioAttemptSummaries } from "../features/practice-scenarios/api.js";
import { deriveScenarioListStatus, type ScenarioListEntry } from "../features/practice-scenarios/practiceProgression.js";
import { ApiError } from "../lib/api/client.js";
import type { PracticeSystemOutletContext } from "./PracticeSystemLayout.js";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "success"; entries: ScenarioListEntry[] };

const STATUS_LABELS: Record<ScenarioListEntry["displayStatus"], string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In Progress",
  completed: "Completed",
};

export function PracticeOverviewPage() {
  const { system, reviewSessionId } = useOutletContext<PracticeSystemOutletContext>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPracticeScenarios(), listPracticeScenarioAttemptSummaries(reviewSessionId)])
      .then(([scenarios, summaries]) => {
        if (!cancelled) setState({ status: "success", entries: deriveScenarioListStatus(scenarios, summaries) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [reviewSessionId]);

  const completedCount = state.status === "success" ? state.entries.filter((e) => e.displayStatus === "completed").length : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Architecture Practice</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-100">{system.title.replace(" Redesign", "")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Work through realistic engineering situations in this system. Investigate what's happening, decide what you'd do,
        and see what the architecture actually does under the scenario you just analyzed.
      </p>

      {state.status === "success" && (
        <p className="mt-4 text-sm font-medium text-slate-300">
          Progress {completedCount} / {state.entries.length}
        </p>
      )}

      <div className="mt-6">
        {state.status === "loading" && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />)}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
            Couldn't load scenarios: {state.message}
          </div>
        )}

        {state.status === "success" && (
          <ol className="flex flex-col gap-3">
            {state.entries.map(({ scenario, displayStatus, summary }) => (
              <li key={scenario.id} className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <span className="w-6 shrink-0 text-sm font-mono text-slate-500">{String(scenario.order).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100">{scenario.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{scenario.shortDescription}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-400" aria-label={`Status: ${STATUS_LABELS[displayStatus]}`}>
                  {STATUS_LABELS[displayStatus]}
                  {summary?.objectiveScore != null && summary.maxObjectiveScore != null && (
                    <span className="ml-1 text-slate-500">
                      · {summary.objectiveScore}/{summary.maxObjectiveScore}
                    </span>
                  )}
                </span>
                {displayStatus === "locked" ? (
                  <span
                    aria-disabled="true"
                    className="shrink-0 cursor-not-allowed rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-500"
                  >
                    Locked
                  </span>
                ) : (
                  <Link
                    to={
                      displayStatus === "completed"
                        ? `/app/practice/${system.slug}/${scenario.id}/result`
                        : `/app/practice/${system.slug}/${scenario.id}`
                    }
                    className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                  >
                    {displayStatus === "completed" ? "View Result" : displayStatus === "in_progress" ? "Continue" : "Start"}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
