import { useOutletContext } from "react-router-dom";
import type { SystemSummary } from "@purgatory/shared";
import { isSystemEmpty } from "../features/systems/grouping.js";

export function SystemOverviewPage() {
  const system = useOutletContext<SystemSummary>();

  if (isSystemEmpty(system)) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-medium text-slate-100">Set up your system</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-400">
          <li>Add or import architecture</li>
          <li>Define requirements</li>
          <li>Create stress scenarios</li>
          <li>Run simulations</li>
        </ol>
      </div>
    );
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <dt className="text-xs text-slate-500">Architecture</dt>
        <dd className="mt-1 text-lg text-slate-100">{system.componentCount} components</dd>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <dt className="text-xs text-slate-500">Scenarios</dt>
        <dd className="mt-1 text-lg text-slate-100">{system.scenarioCount} stress scenarios</dd>
      </div>
    </dl>
  );
}
