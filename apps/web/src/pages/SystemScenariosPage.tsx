import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { z } from "zod";
import { PracticeScenarioSchema, type PracticeScenario, type SystemSummary } from "@purgatory/shared";
import { apiGet, ApiError } from "../lib/api/client.js";

function getScenarios() {
  return apiGet("/api/practice-scenarios", (data) => z.array(PracticeScenarioSchema).parse(data));
}

export function SystemScenariosPage() {
  const system = useOutletContext<SystemSummary>();
  const [scenarios, setScenarios] = useState<PracticeScenario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (system.sourceType !== "sample") return;
    let cancelled = false;
    getScenarios()
      .then((data) => {
        if (!cancelled) setScenarios(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, [system.sourceType]);

  if (system.sourceType !== "sample") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">No stress scenarios yet.</p>
        <p className="mt-3 text-xs text-slate-500">Create scenarios manually or generate them from your architecture (coming soon).</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
        Couldn't load scenarios: {error}
      </div>
    );
  }

  if (!scenarios) {
    return <div className="h-48 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {scenarios.map((scenario) => (
        <li key={scenario.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-100">{scenario.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{scenario.shortDescription}</p>
          <Link
            to={`/app/practice/${system.slug}/${scenario.id}`}
            className="mt-3 inline-flex w-fit items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white"
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}
