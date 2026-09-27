import type { StressParameterDefinition, StressProfile } from "@redline/shared";
import type { StressParameterValues } from "../parameterState.js";

function formatValue(def: StressParameterDefinition, value: number): string {
  if (def.type === "percentage") return `${Math.round(value * 100)}%`;
  const formatted = def.unit === "req/min" ? value.toLocaleString() : String(value);
  return def.unit ? `${formatted} ${def.unit}` : formatted;
}

function StressParameterControl({
  definition,
  value,
  onChange,
}: {
  definition: StressParameterDefinition;
  value: number;
  onChange: (next: number) => void;
}) {
  const sliderStep = definition.type === "percentage" ? (definition.step ?? 0.05) : (definition.step ?? 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={definition.id} className="text-sm font-medium text-slate-200">
          {definition.label}
        </label>
        <span className="text-sm font-semibold text-slate-100">{formatValue(definition, value)}</span>
      </div>
      <p className="text-xs text-slate-500">{definition.description}</p>
      {definition.editable ? (
        <input
          id={definition.id}
          type="range"
          value={value}
          min={definition.min ?? 0}
          max={definition.max ?? value}
          step={sliderStep}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={formatValue(definition, value)}
          className="accent-sky-500"
        />
      ) : (
        <p className="text-xs italic text-slate-600">Fixed for this test.</p>
      )}
    </div>
  );
}

export function ParameterForm({
  profile,
  values,
  onChange,
  onReset,
  error,
  isCustom,
}: {
  profile: StressProfile;
  values: StressParameterValues;
  onChange: (parameterId: string, value: number) => void;
  onReset: () => void;
  error: string | undefined;
  isCustom: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Conditions <span className="ml-1 normal-case text-slate-600">({isCustom ? "Custom" : "Scenario Default"})</span>
        </p>
        <button type="button" onClick={onReset} className="text-xs font-medium text-sky-400 hover:text-sky-300">
          Reset to Scenario Defaults
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {profile.parameters.map((definition) => (
          <StressParameterControl key={definition.id} definition={definition} value={values[definition.id] ?? definition.defaultValue} onChange={(v) => onChange(definition.id, v)} />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
