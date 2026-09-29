import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { ArchitectureRequirement, SystemSummary } from "@purgatory/shared";
import { getScenarioBySlug } from "../features/scenarios/api.js";
import { ApiError } from "../lib/api/client.js";

export function SystemRequirementsPage() {
  const system = useOutletContext<SystemSummary>();
  const [requirements, setRequirements] = useState<ArchitectureRequirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (system.sourceType !== "sample") return;
    let cancelled = false;
    getScenarioBySlug(system.slug)
      .then((data) => {
        if (!cancelled) setRequirements(data.requirements);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, [system.slug, system.sourceType]);

  if (system.sourceType !== "sample") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">No requirements defined.</p>
        <p className="mt-3 text-xs text-slate-500">
          Requirements describe the conditions your system must maintain under stress.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
        Couldn't load requirements: {error}
      </div>
    );
  }

  if (!requirements) {
    return <div className="h-48 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {requirements.map((req) => (
        <li key={req.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{req.area}</p>
          <p className="mt-1 text-sm text-slate-200">{req.summary}</p>
          {req.target && <p className="mt-1 text-xs text-slate-500">Target: {req.target}</p>}
        </li>
      ))}
    </ul>
  );
}
