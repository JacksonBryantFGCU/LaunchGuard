import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ReviewHistoryItem } from "@redline/shared";
import { getReviewHistory } from "../features/review-session/api.js";
import { ApiError } from "../lib/api/client.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: ReviewHistoryItem[] };

export function ReviewHistoryPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getReviewHistory()
      .then((items) => {
        if (!cancelled) setState({ status: "success", items });
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
      <h1 className="text-xl font-semibold text-slate-100">Review History</h1>
      <p className="mt-1 text-sm text-slate-400">Your past and in-progress architecture reviews.</p>

      <div className="mt-8">
        {state.status === "loading" && (
          <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" aria-busy="true" aria-live="polite" />
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
            Couldn't load your history: {state.message}
          </div>
        )}

        {state.status === "success" && state.items.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            You haven't started a review yet.{" "}
            <Link to="/app" className="underline underline-offset-4">
              Browse the scenario library
            </Link>
            .
          </div>
        )}

        {state.status === "success" && state.items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.items.map((item) => {
              const submitted = item.status === "submitted";
              const completedStressTests = item.stressProgress.filter((p) => p.status === "passed" || p.status === "failed").length;
              return (
                <li key={item.reviewId} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{item.scenarioSlug}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {submitted ? `Submitted ${new Date(item.submittedAt!).toLocaleString()}` : `Started ${new Date(item.startedAt).toLocaleString()}`}
                      {" · "}
                      {item.redlineCount} redline{item.redlineCount === 1 ? "" : "s"}
                      {item.stressProgress.length > 0 && ` · ${completedStressTests}/${item.stressProgress.length} stress tests`}
                    </p>
                  </div>
                  <Link
                    to={submitted ? `/app/review/${item.scenarioSlug}/submitted?reviewId=${item.reviewId}` : `/app/review/${item.scenarioSlug}`}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                  >
                    {submitted ? "View Review" : "Continue Review"}
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
