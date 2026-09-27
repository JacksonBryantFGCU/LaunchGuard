import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ReviewHistoryItem } from "@redline/shared";
import { getReviewHistory } from "../features/review-session/api.js";
import { listPracticeScenarios, listPracticeScenarioAttemptSummaries } from "../features/practice-scenarios/api.js";
import { deriveScenarioListStatus } from "../features/practice-scenarios/practiceProgression.js";
import { ApiError } from "../lib/api/client.js";

interface HistoryRow {
  item: ReviewHistoryItem;
  completedCount: number;
  totalCount: number;
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "success"; rows: HistoryRow[] };

export function ReviewHistoryPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getReviewHistory(), listPracticeScenarios()])
      .then(async ([items, scenarios]) => {
        const rows = await Promise.all(
          items.map(async (item) => {
            const summaries = await listPracticeScenarioAttemptSummaries(item.reviewId).catch(() => []);
            const entries = deriveScenarioListStatus(scenarios, summaries);
            return {
              item,
              completedCount: entries.filter((e) => e.displayStatus === "completed").length,
              totalCount: entries.length,
            };
          }),
        );
        if (!cancelled) setState({ status: "success", rows });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-100">History</h1>
      <p className="mt-1 text-sm text-slate-400">Your system architecture practice, by system.</p>

      <div className="mt-8">
        {state.status === "loading" && (
          <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" aria-busy="true" aria-live="polite" />
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
            Couldn't load your history: {state.message}
          </div>
        )}

        {state.status === "success" && state.rows.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            You haven't started practicing yet.{" "}
            <Link to="/app" className="underline underline-offset-4">
              Browse systems
            </Link>
            .
          </div>
        )}

        {state.status === "success" && state.rows.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.rows.map(({ item, completedCount, totalCount }) => {
              const allComplete = totalCount > 0 && completedCount === totalCount;
              return (
                <li key={item.reviewId} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{item.scenarioSlug}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {totalCount > 0 ? `${completedCount} / ${totalCount} scenarios completed` : "Not started"}
                      {" · "}
                      Last activity {new Date(item.submittedAt ?? item.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/app/practice/${item.scenarioSlug}`}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                  >
                    {allComplete ? "View Results" : "Continue Practice"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
