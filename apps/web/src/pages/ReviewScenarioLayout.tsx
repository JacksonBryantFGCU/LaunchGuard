import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import type { PublicReviewScenario } from "@redline/shared";
import { getScenarioBySlug } from "../features/scenarios/api.js";
import { ApiError } from "../lib/api/client.js";
import { ReviewSessionProvider } from "../features/review/ReviewSessionContext.js";
import { PullRequestHeader } from "../components/review/PullRequestHeader.js";

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; scenario: PublicReviewScenario };

export function ReviewScenarioLayout() {
  const { scenarioSlug } = useParams<{ scenarioSlug: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!scenarioSlug) return;
    let cancelled = false;
    getScenarioBySlug(scenarioSlug)
      .then((scenario) => {
        if (!cancelled) setState({ status: "success", scenario });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: "not-found" });
        } else {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioSlug]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-16">
        <h1 className="text-xl font-semibold text-slate-100">Scenario not found</h1>
        <p className="text-sm text-slate-400">There's no review scenario at "{scenarioSlug}".</p>
        <Link to="/" className="text-sm font-medium text-slate-100 underline underline-offset-4">
          Back to Scenario Library
        </Link>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load this scenario: {state.message}
        </div>
      </main>
    );
  }

  return (
    <ReviewSessionProvider scenario={state.scenario}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <PullRequestHeader scenario={state.scenario} />
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </ReviewSessionProvider>
  );
}
