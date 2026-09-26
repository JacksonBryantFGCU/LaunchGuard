import { useEffect, useState } from "react";
import { Link, Outlet, useParams, useSearchParams } from "react-router-dom";
import type { PublicArchitectureScenario } from "@redline/shared";
import { getScenarioBySlug } from "../features/scenarios/api.js";
import { ApiError } from "../lib/api/client.js";
import { ReviewStateProvider } from "../features/architecture-review/ReviewStateContext.js";

export interface ReviewOutletContext {
  scenario: PublicArchitectureScenario;
}

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; scenario: PublicArchitectureScenario };

// Mounted once per scenario, above the workspace/summary/submitted routes,
// so the review-state provider survives navigation between them.
export function ArchitectureReviewLayout() {
  const { scenarioSlug } = useParams<{ scenarioSlug: string }>();
  const [searchParams] = useSearchParams();
  const reviewId = searchParams.get("reviewId");
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
        <p className="text-sm text-slate-400">There's no architecture review scenario at "{scenarioSlug}".</p>
        <Link to="/app" className="text-sm font-medium text-slate-100 underline underline-offset-4">
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
    <ReviewStateProvider scenarioSlug={state.scenario.slug} sessionId={reviewId}>
      <Outlet context={{ scenario: state.scenario } satisfies ReviewOutletContext} />
    </ReviewStateProvider>
  );
}
