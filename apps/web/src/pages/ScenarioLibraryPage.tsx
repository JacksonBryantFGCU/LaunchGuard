import { useEffect, useState } from "react";
import type { ArchitectureScenarioPreview } from "@redline/shared";
import { getScenarioPreviews } from "../features/scenarios/api.js";
import { ApiError } from "../lib/api/client.js";
import { ScenarioCard } from "../components/scenarios/ScenarioCard.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; scenarios: ArchitectureScenarioPreview[] };

export function ScenarioLibraryPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getScenarioPreviews()
      .then((scenarios) => {
        if (!cancelled) setState({ status: "success", scenarios });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-100">Architecture Scenario Library</h1>
      <p className="mt-1 text-sm text-slate-400">
        Review a proposed system architecture from another engineer before it moves forward.
      </p>

      <div className="mt-8">
        {state.status === "loading" && (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-live="polite">
            {[0, 1].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
            Couldn't load scenarios: {state.message}
          </div>
        )}

        {state.status === "success" && state.scenarios.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            No scenarios are available yet.
          </div>
        )}

        {state.status === "success" && state.scenarios.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {state.scenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
