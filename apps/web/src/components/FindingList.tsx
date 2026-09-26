import { useMemo, useState } from "react";
import type { Finding, FindingCategory, FindingSeverity } from "@launchguard/shared";
import { FindingCard } from "./FindingCard";

interface FindingListProps {
  findings: Finding[];
}

export function FindingList({ findings }: FindingListProps) {
  const severities = useMemo(() => uniqueInOrder(findings.map((f) => f.severity)), [findings]);
  const categories = useMemo(() => uniqueInOrder(findings.map((f) => f.category)), [findings]);

  const [activeSeverities, setActiveSeverities] = useState<Set<FindingSeverity>>(new Set(severities));
  const [activeCategories, setActiveCategories] = useState<Set<FindingCategory>>(new Set(categories));

  const visible = findings.filter((f) => activeSeverities.has(f.severity) && activeCategories.has(f.category));

  if (findings.length === 0) {
    return <p className="text-slate-600">No findings — nothing to report for this repository.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
        <FilterGroup label="Severity" values={severities} active={activeSeverities} onChange={setActiveSeverities} />
        <FilterGroup label="Category" values={categories} active={activeCategories} onChange={setActiveCategories} />
      </div>

      {visible.length === 0 ? (
        <p className="text-slate-600">No findings match the selected filters.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((finding) => (
            <FindingCard key={finding.ruleId} finding={finding} />
          ))}
        </ul>
      )}
    </div>
  );
}

function uniqueInOrder<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function FilterGroup<T extends string>({
  label,
  values,
  active,
  onChange,
}: {
  label: string;
  values: T[];
  active: Set<T>;
  onChange: (next: Set<T>) => void;
}) {
  if (values.length <= 1) return null;

  function toggle(value: T) {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-sm text-slate-700 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white"
          >
            <input type="checkbox" className="sr-only" checked={active.has(value)} onChange={() => toggle(value)} />
            {value}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
