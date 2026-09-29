import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import type { SystemSummary } from "@purgatory/shared";
import { getSystem } from "../features/systems/api.js";
import { sourceLabel, workspaceTabs } from "../features/systems/grouping.js";
import { ApiError } from "../lib/api/client.js";
import { Badge } from "../components/ui/Badge.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; system: SystemSummary };

const TAB_LABELS: Record<(typeof workspaceTabs)[number], string> = {
  overview: "Overview",
  architecture: "Architecture",
  requirements: "Requirements",
  scenarios: "Scenarios",
  simulations: "Simulations",
  findings: "Findings",
};

export function SystemWorkspaceLayout() {
  const { systemId } = useParams<{ systemId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!systemId) return;
    let cancelled = false;
    getSystem(systemId)
      .then((system) => {
        if (!cancelled) setState({ status: "success", system });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  if (state.status === "loading") {
    return <main className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-400">Loading system…</main>;
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load this system: {state.message}
        </div>
      </main>
    );
  }

  const { system } = state;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{system.name}</h1>
          {system.description && <p className="mt-1 text-sm text-slate-400">{system.description}</p>}
        </div>
        <Badge>{sourceLabel(system.sourceType)}</Badge>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-slate-800">
        {workspaceTabs.map((tab) => (
          <NavLink
            key={tab}
            to={tab === "overview" ? "" : tab}
            end
            className={({ isActive }) =>
              `rounded-t-md px-3 py-2 text-sm ${isActive ? "border-b-2 border-slate-100 text-slate-100" : "text-slate-400 hover:text-slate-100"}`
            }
          >
            {TAB_LABELS[tab]}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet context={system} />
      </div>
    </div>
  );
}
