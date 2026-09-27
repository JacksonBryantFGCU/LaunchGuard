// Single source of truth for legal practice-scenario status transitions.
// "available"/"locked" are deliberately not states here - they're derived
// (no attempt row yet = available or locked, depending on prior scenario
// completion), not persisted.
export type PracticeScenarioStatus =
  | "investigating"
  | "submitted"
  | "feedback_ready"
  | "consequence_ready"
  | "completed";

const ALLOWED_TRANSITIONS: Record<PracticeScenarioStatus, PracticeScenarioStatus[]> = {
  investigating: ["submitted"],
  submitted: ["feedback_ready"],
  feedback_ready: ["consequence_ready"],
  consequence_ready: ["completed"],
  completed: [],
};

export function canTransitionPracticeScenarioStatus(
  from: PracticeScenarioStatus,
  to: PracticeScenarioStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
