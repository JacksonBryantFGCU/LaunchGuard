import { useEffect, useState } from "react";
import { Outlet, useOutletContext, useParams } from "react-router-dom";
import type { PracticeScenario, PublicArchitectureScenario } from "@purgatory/shared";
import { getPracticeScenarioById } from "../features/practice-scenarios/api.js";
import { PracticeAttemptProvider } from "../features/practice-scenarios/PracticeAttemptContext.js";
import { ApiError } from "../lib/api/client.js";
import type { PracticeSystemOutletContext } from "./PracticeSystemLayout.js";

export interface PracticeScenarioOutletContext {
  system: PublicArchitectureScenario;
  practiceScenario: PracticeScenario;
  reviewSessionId: string;
}

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; practiceScenario: PracticeScenario };

export function PracticeScenarioLayout() {
  const { system, reviewSessionId } = useOutletContext<PracticeSystemOutletContext>();
  const { practiceScenarioId } = useParams<{ practiceScenarioId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!practiceScenarioId) return;
    let cancelled = false;
    getPracticeScenarioById(practiceScenarioId)
      .then((practiceScenario) => {
        if (!cancelled) setState({ status: "success", practiceScenario });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "not-found" });
        else setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [practiceScenarioId]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-xl font-semibold text-slate-100">Scenario not found</h1>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load this scenario: {state.message}
        </div>
      </main>
    );
  }

  return (
    <PracticeAttemptProvider reviewSessionId={reviewSessionId} practiceScenarioId={state.practiceScenario.id}>
      <Outlet context={{ system, practiceScenario: state.practiceScenario, reviewSessionId } satisfies PracticeScenarioOutletContext} />
    </PracticeAttemptProvider>
  );
}
