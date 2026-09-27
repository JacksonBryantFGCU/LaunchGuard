import type { AddComponentModification, InterventionDefinition, InterventionTarget } from "@purgatory/shared";

/** Mirrors the backend's placement rule (packages/scenarios/src/stressLab/compatibility.ts) - both operate purely on public InterventionDefinition/InterventionTarget data, so there's no private truth to duplicate. */
export function isValidPlacement(intervention: InterventionDefinition, target: InterventionTarget): boolean {
  return intervention.validTargets.some((valid) => valid.nodeId === target.nodeId && valid.edgeId === target.edgeId);
}

export interface EditIntoResult {
  modifications: AddComponentModification[];
  error?: string;
}

/**
 * The frontend's design-mode state is the resolved, current list of active
 * add-component modifications (never a longer add/remove/configure event
 * log) - it declares the desired end state each run, which the
 * ArchitectureModificationSchema already accepts as a valid modifications
 * array on its own.
 */
export function addIntervention(
  modifications: AddComponentModification[],
  intervention: InterventionDefinition,
  target: InterventionTarget,
): EditIntoResult {
  if (!isValidPlacement(intervention, target)) {
    return { modifications, error: `${intervention.label} cannot target this component.` };
  }
  const mod: AddComponentModification = {
    kind: "add-component",
    id: crypto.randomUUID(),
    componentType: intervention.componentType,
    ...(target.nodeId ? { targetNodeId: target.nodeId } : {}),
    ...(target.edgeId ? { targetEdgeId: target.edgeId } : {}),
    config: Object.fromEntries(intervention.configFields.map((f) => [f.key, f.defaultValue])),
  };
  return { modifications: [...modifications, mod] };
}

export function removeIntervention(modifications: AddComponentModification[], modificationId: string): AddComponentModification[] {
  return modifications.filter((m) => m.id !== modificationId);
}

export function configureIntervention(
  modifications: AddComponentModification[],
  modificationId: string,
  config: Record<string, number>,
): AddComponentModification[] {
  return modifications.map((m) => (m.id === modificationId ? { ...m, config: { ...m.config, ...config } } : m));
}
