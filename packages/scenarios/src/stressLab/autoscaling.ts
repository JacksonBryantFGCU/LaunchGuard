export interface AutoscalePolicy {
  minInstances: number;
  maxInstances: number;
  scaleStep: number;
  cooldownSeconds: number;
}

export interface AutoscaleState {
  instances: number;
  secondsSinceLastScale: number;
}

// Autoscaling reacts to load over simulated time (spec #14) - it does not
// jump straight to the needed instance count. Each eligible step (cooldown
// elapsed) moves at most scaleStep instances toward the target, clamped to
// [minInstances, maxInstances].
export function stepAutoscale(state: AutoscaleState, neededInstances: number, policy: AutoscalePolicy, stepSeconds: number): AutoscaleState {
  const target = Math.min(Math.max(neededInstances, policy.minInstances), policy.maxInstances);
  const cooldownElapsed = state.secondsSinceLastScale >= policy.cooldownSeconds;

  if (!cooldownElapsed || target === state.instances) {
    return { instances: state.instances, secondsSinceLastScale: state.secondsSinceLastScale + stepSeconds };
  }

  const direction = target > state.instances ? 1 : -1;
  const delta = Math.min(policy.scaleStep, Math.abs(target - state.instances));
  return { instances: state.instances + direction * delta, secondsSinceLastScale: 0 };
}
