import type { EdgeEffectState, NodeEffectState, StressTestStepReveal } from "@redline/shared";

export interface StressOverlay {
  nodeStates: Record<string, NodeEffectState | null>;
  edgeStates: Record<string, EdgeEffectState | null>;
}

/**
 * Derives visual overlay state from the base architecture (all node/edge
 * ids) plus the currently active stress-test step, never mutating the
 * underlying scenario data. `null` means "no override, render normally" -
 * distinct from the "normal" effect state a step can author explicitly.
 */
export function computeStressOverlay(
  step: StressTestStepReveal | null,
  nodeIds: string[],
  edgeIds: string[],
): StressOverlay {
  const nodeStates: Record<string, NodeEffectState | null> = {};
  for (const id of nodeIds) nodeStates[id] = null;

  const edgeStates: Record<string, EdgeEffectState | null> = {};
  for (const id of edgeIds) edgeStates[id] = null;

  if (step) {
    for (const effect of step.nodeEffects) nodeStates[effect.nodeId] = effect.state;
    for (const effect of step.edgeEffects) edgeStates[effect.edgeId] = effect.state;
  }

  return { nodeStates, edgeStates };
}
