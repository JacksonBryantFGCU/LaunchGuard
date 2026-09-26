import { useState } from "react";
import type { PublicArchitectureScenario } from "@redline/shared";
import { Badge } from "../ui/Badge.js";
import { DIFFICULTY_LABELS, FOCUS_LABELS } from "../../features/scenarios/labels.js";

const TABS = ["Overview", "Requirements", "Constraints", "Evidence"] as const;
type Tab = (typeof TABS)[number];

export function RequirementsPanel({ scenario }: { scenario: PublicArchitectureScenario }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-slate-800 bg-slate-950">
      <div role="tablist" aria-label="Scenario information" className="flex border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              tab === t ? "border-b-2 border-sky-500 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "Overview" && <OverviewTab scenario={scenario} />}
        {tab === "Requirements" && <RequirementsTab scenario={scenario} />}
        {tab === "Constraints" && <ConstraintsTab scenario={scenario} />}
        {tab === "Evidence" && <EvidenceTab scenario={scenario} />}
      </div>
    </div>
  );
}

function OverviewTab({ scenario }: { scenario: PublicArchitectureScenario }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{DIFFICULTY_LABELS[scenario.difficulty]}</Badge>
        {scenario.focusAreas.map((focus) => (
          <Badge key={focus}>{FOCUS_LABELS[focus]}</Badge>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{scenario.description}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-500">Review</dt>
          <dd className="mt-0.5 font-medium text-slate-200">{scenario.reviewCode}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="mt-0.5 font-medium text-slate-200">{scenario.status}</dd>
        </div>
      </dl>
    </div>
  );
}

function RequirementsTab({ scenario }: { scenario: PublicArchitectureScenario }) {
  return (
    <ul className="flex flex-col gap-3">
      {scenario.requirements.map((req) => (
        <li key={req.id} className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{req.area}</p>
          <p className="mt-0.5 text-sm text-slate-200">{req.summary}</p>
          {req.target && <p className="mt-1 text-xs font-medium text-sky-400">{req.target}</p>}
        </li>
      ))}
    </ul>
  );
}

function ConstraintsTab({ scenario }: { scenario: PublicArchitectureScenario }) {
  return (
    <ul className="flex flex-col gap-2">
      {scenario.constraints.map((constraint) => (
        <li key={constraint.id} className="rounded-md border border-slate-800 bg-slate-900 p-2.5 text-sm text-slate-300">
          {constraint.summary}
        </li>
      ))}
    </ul>
  );
}

function EvidenceTab({ scenario }: { scenario: PublicArchitectureScenario }) {
  const grouped = scenario.evidence.reduce<Record<string, typeof scenario.evidence>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</p>
          <dl className="mt-2 flex flex-col gap-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
                <dt className="text-slate-400">{item.label}</dt>
                <dd className="font-medium text-slate-200">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
