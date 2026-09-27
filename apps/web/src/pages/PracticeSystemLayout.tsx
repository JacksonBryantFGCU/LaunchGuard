import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import type { PublicArchitectureScenario } from "@purgatory/shared";
import { getScenarioBySlug } from "../features/scenarios/api.js";
import { ApiError } from "../lib/api/client.js";
import { ReviewStateProvider } from "../features/architecture-review/ReviewStateContext.js";
import { useReviewState } from "../features/architecture-review/reviewStateStore.js";

export interface PracticeSystemOutletContext {
  system: PublicArchitectureScenario;
  reviewSessionId: string;
}

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; system: PublicArchitectureScenario };

// One system practice run = one review_session (Phase 2), so this reuses
// ReviewStateProvider - the same start-or-resume session and the same
// voice/transcript machinery the practice-scenario Architect panel needs.
export function PracticeSystemLayout() {
  const { systemSlug } = useParams<{ systemSlug: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!systemSlug) return;
    let cancelled = false;
    getScenarioBySlug(systemSlug)
      .then((system) => {
        if (!cancelled) setState({ status: "success", system });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "not-found" });
        else setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [systemSlug]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-xl font-semibold text-slate-100">System not found</h1>
        <p className="mt-2 text-sm text-slate-400">There's no practice system at "{systemSlug}".</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load this system: {state.message}
        </div>
      </main>
    );
  }

  return (
    <ReviewStateProvider scenarioSlug={state.system.slug}>
      <PracticeSystemOutlet system={state.system} />
    </ReviewStateProvider>
  );
}

function PracticeSystemOutlet({ system }: { system: PublicArchitectureScenario }) {
  const { state } = useReviewState();
  if (!state.reviewSessionId) return null;
  return <Outlet context={{ system, reviewSessionId: state.reviewSessionId } satisfies PracticeSystemOutletContext} />;
}
