import type { PublicArchitectureScenario } from "@redline/shared";
import { Badge } from "../ui/Badge.js";

export function ScenarioHeader({ scenario }: { scenario: PublicArchitectureScenario }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
      <div>
        <h1 className="text-sm font-semibold text-slate-100">{scenario.title}</h1>
        <p className="text-xs text-slate-500">Architecture Review · {scenario.reviewCode}</p>
      </div>
      <Badge>{scenario.status}</Badge>
    </header>
  );
}
