/**
 * Safe, frontend-only context for a "contextual Architect" voice session
 * launched from the Stress Lab. Every field here is text the learner can
 * already see on screen (a selected component's label, a bottleneck's
 * observed metric/threshold, a requirement's own status/target, a metric
 * snapshot) - never the internal scenario's hidden risks, stress-test
 * definitions, or evaluation rubric, which this module never has access to
 * in the first place (those live only in apps/api). Alex remains the
 * architecture author, not the grader: nothing here is a recommended fix.
 */
export interface StressLabVoiceFocus {
  focusLabel?: string;
  bottleneckSummary?: string;
  requirementSummary?: string;
  metricsSummary?: string;
}

/** Drops undefined fields - the request body (and the dynamicVariables it becomes) only ever contains what was actually selected. */
export function buildStressLabVoiceContext(focus: StressLabVoiceFocus): Record<string, string> {
  const entries = Object.entries(focus).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0);
  return Object.fromEntries(entries);
}

export interface BottleneckFocus {
  metric: string;
  targetId: string;
}

const GENERIC_QUESTIONS = [
  "What did you expect this component to do under normal load?",
  "What assumptions did you make about how this part of the system would behave?",
];

/**
 * Dynamic suggested questions, by the flavor of what's currently selected -
 * never the same fixed list, and never phrased as an answer or a fix (spec
 * #15/#16). Keyword-matched against the bottleneck's metric/targetId text,
 * which is all this module has - the same limitation as the requirement/
 * bottleneck correlation in resultSummary.ts.
 */
export function suggestedQuestionsForFocus(focus: BottleneckFocus): string[] {
  const text = `${focus.metric} ${focus.targetId}`.toLowerCase();
  if (/db|database|postgres|connection|pool/.test(text)) {
    return [
      "How did you expect database connections to behave as traffic scaled?",
      "Why is the database's connection capacity fixed at this level?",
      "What failure behavior did you design for once connections run out?",
    ];
  }
  if (/provider|payment|gateway|latency|timeout/.test(text)) {
    return [
      "What happens when this provider becomes slow?",
      "What timeout behavior did you intend for this dependency?",
      "How are retries handled when this call is slow or fails?",
    ];
  }
  if (/queue|worker|backlog/.test(text)) {
    return [
      "What did you expect this queue's depth to look like under a spike?",
      "What happens to a message when a worker can't keep up?",
    ];
  }
  return GENERIC_QUESTIONS;
}
