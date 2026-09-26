import { useState, type FormEvent } from "react";
import type { ArchitectureRiskCategory, RedlineSeverity, RedlineTargetType } from "@redline/shared";
import { RISK_CATEGORY_LABELS, SEVERITY_LABELS } from "../../features/scenarios/labels.js";
import { validateRedlineDraft } from "../../features/architecture-review/redlineValidation.js";
import type { RedlineDraft } from "../../features/architecture-review/reviewState.js";

const CATEGORIES = Object.keys(RISK_CATEGORY_LABELS) as ArchitectureRiskCategory[];
const SEVERITIES = Object.keys(SEVERITY_LABELS) as RedlineSeverity[];

interface RedlineComposerProps {
  targetType: RedlineTargetType;
  targetId: string;
  targetLabel: string;
  initial?: Pick<RedlineDraft, "category" | "severity" | "title" | "reasoning">;
  onSave: (draft: RedlineDraft) => void;
  onCancel: () => void;
}

export function RedlineComposer({ targetType, targetId, targetLabel, initial, onSave, onCancel }: RedlineComposerProps) {
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0]!);
  const [severity, setSeverity] = useState<string>(initial?.severity ?? "medium");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [reasoning, setReasoning] = useState(initial?.reasoning ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateRedlineDraft({ targetType, targetId, category, severity, title, reasoning });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave(result.draft);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-label="Add redline">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
        <p className="mt-0.5 text-sm text-slate-200">{targetLabel}</p>
      </div>

      <div>
        <label htmlFor="redline-category" className="text-xs font-medium text-slate-400">
          Category
        </label>
        <select
          id="redline-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {RISK_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category}</p>}
      </div>

      <div>
        <label htmlFor="redline-severity" className="text-xs font-medium text-slate-400">
          Severity
        </label>
        <select
          id="redline-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
        {errors.severity && <p className="mt-1 text-xs text-red-400">{errors.severity}</p>}
      </div>

      <div>
        <label htmlFor="redline-title" className="text-xs font-medium text-slate-400">
          Finding
        </label>
        <input
          id="redline-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="External payment dependency has no explicit timeout"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600"
        />
        {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="redline-reasoning" className="text-xs font-medium text-slate-400">
          Reasoning
        </label>
        <textarea
          id="redline-reasoning"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="A provider degradation could hold checkout requests open..."
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600"
        />
        {errors.reasoning && <p className="mt-1 text-xs text-red-400">{errors.reasoning}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500">
          Save Redline
        </button>
      </div>
    </form>
  );
}
