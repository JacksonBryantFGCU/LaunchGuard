import type { InterventionDefinition, InterventionTarget } from "@redline/shared";

// Prevents nonsensical placement (spec #19): a modification is only valid if
// it matches one of the intervention's authored targets exactly.
export function isValidPlacement(intervention: InterventionDefinition, target: InterventionTarget): boolean {
  return intervention.validTargets.some((valid) => valid.nodeId === target.nodeId && valid.edgeId === target.edgeId);
}
