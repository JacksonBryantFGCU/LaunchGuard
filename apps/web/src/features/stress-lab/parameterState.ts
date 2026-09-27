import type { StressProfile } from "@redline/shared";

export type StressParameterValues = Record<string, number>;

export function initializeParameterValues(profile: StressProfile): StressParameterValues {
  return Object.fromEntries(profile.parameters.map((p) => [p.id, p.defaultValue]));
}

export function resetParameterValues(profile: StressProfile): StressParameterValues {
  return initializeParameterValues(profile);
}

export interface SetParameterValueResult {
  values: StressParameterValues;
  error?: string;
}

/** Validates client-side against the same public parameter definition the backend also validates against - never silently clamps (spec #6). */
export function setParameterValue(
  values: StressParameterValues,
  profile: StressProfile,
  parameterId: string,
  raw: number,
): SetParameterValueResult {
  const definition = profile.parameters.find((p) => p.id === parameterId);
  if (!definition) return { values, error: `Unknown parameter: ${parameterId}` };
  if (!definition.editable) return { values, error: `${definition.label} cannot be changed for this test.` };
  if (definition.min !== undefined && raw < definition.min) {
    return { values, error: `${definition.label} must be at least ${definition.min}.` };
  }
  if (definition.max !== undefined && raw > definition.max) {
    return { values, error: `${definition.label} must be at most ${definition.max}.` };
  }
  return { values: { ...values, [parameterId]: raw } };
}
