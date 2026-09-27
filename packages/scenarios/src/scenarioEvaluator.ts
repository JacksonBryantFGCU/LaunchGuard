import type {
  ScenarioResponse,
  ConceptCheck,
  WrittenResponseEvaluation,
  ResilienceEvaluation,
  ScenarioEvaluationResult,
  StressParameterValues,
  StressProfile,
} from "@purgatory/shared";
import type { ConceptGroup, InternalPracticeScenario } from "./internalPracticeScenario.js";

// Deterministic objective evaluation only (no LLM grading). Concept
// matching is a case-insensitive substring check against small authored
// phrase groups - see ConceptGroupSchema. This is the whole matcher: no
// embeddings, no keyword dictionaries.
function checkConcepts(text: string, concepts: ConceptGroup[]): ConceptCheck[] {
  const lower = text.toLowerCase();
  return concepts.map((concept) => ({
    id: concept.id,
    label: concept.label,
    matched: concept.phrases.some((phrase) => lower.includes(phrase.toLowerCase())),
    teaching: concept.teaching,
  }));
}

function scoreFraction(checks: ConceptCheck[], points: number): number {
  if (checks.length === 0) return 0;
  const matched = checks.filter((c) => c.matched).length;
  return Math.round(points * (matched / checks.length));
}

/**
 * Objective scoring only: Diagnosis 6 + Evidence & Requirement Use 4 +
 * Immediate Response 3 + Architecture Decision 3 = 16. Reasoning/tradeoff
 * quality is qualitative and deliberately left unscored (a later phase).
 *
 * ponytail: diagnosis concept matching also scans investigationPlan text
 * (both describe "understanding the situation"), rather than tracking
 * acceptedInvestigationConcepts as a separately-scored fifth dimension.
 * Revisit if a future rubric wants investigation reasoning scored on its
 * own.
 */
export function evaluateScenarioResponse(
  response: ScenarioResponse,
  scenario: InternalPracticeScenario,
): WrittenResponseEvaluation {
  const diagnosisConcepts = checkConcepts(
    `${response.diagnosis} ${response.investigationPlan}`,
    scenario.expectedConcepts,
  );
  const immediateActionConcepts = checkConcepts(response.immediateAction, scenario.acceptedImmediateActionConcepts);
  const architectureDecisionConcepts = checkConcepts(
    response.architectureDecision,
    scenario.acceptedArchitectureDecisionConcepts,
  );

  const matchedRequirementIds = response.affectedRequirementIds.filter((id) =>
    scenario.expectedRequirementIds.includes(id),
  );
  const missedRequirementIds = scenario.expectedRequirementIds.filter(
    (id) => !response.affectedRequirementIds.includes(id),
  );
  const requirementFraction = matchedRequirementIds.length / scenario.expectedRequirementIds.length;
  const evidenceUsed = response.evidenceIds.some((id) => scenario.relevantEvidenceIds.includes(id));

  const diagnosisScore = scoreFraction(diagnosisConcepts, 6);
  const evidenceRequirementScore = Math.round(4 * (requirementFraction * 0.5 + (evidenceUsed ? 1 : 0) * 0.5));
  const immediateActionScore = scoreFraction(immediateActionConcepts, 3);
  const architectureDecisionScore = scoreFraction(architectureDecisionConcepts, 3);

  return {
    scenarioId: scenario.publicScenario.id,
    objectiveScore: diagnosisScore + evidenceRequirementScore + immediateActionScore + architectureDecisionScore,
    maxObjectiveScore: 16,

    diagnosisScore,
    evidenceRequirementScore,
    immediateActionScore,
    architectureDecisionScore,

    diagnosisConcepts,
    immediateActionConcepts,
    architectureDecisionConcepts,

    matchedRequirementIds,
    missedRequirementIds,
    evidenceUsed,

    submittedSeverity: response.severity,
    expectedSeverity: scenario.severityTruth,
    severityAligned: response.severity === scenario.severityTruth,
  };
}

const MAX_RESILIENCE_SCORE = 8;

interface StressRunOutcome {
  testId: string;
  parameters: StressParameterValues;
  // The worst-case margin (0-1) across the run's own requirements - see
  // marginBelowTarget/marginAboveTarget in stressLab/engine.ts. A violated
  // requirement always carries marginRatio 0, so a genuinely failed run
  // already scores 0 here without needing a separate passed check.
  requirementResults: { marginRatio: number }[];
}

function ranAtDefaultParameters(profile: StressProfile, parameters: StressParameterValues): boolean {
  return profile.parameters.every((p) => (parameters[p.id] ?? p.defaultValue) === p.defaultValue);
}

/**
 * The worst margin across a run's own requirements - one violated or thin
 * requirement caps the whole run's credit, same principle as "passed"
 * requiring every requirement to hold. Defaults a missing/non-finite
 * marginRatio to 0 (pessimistic, never a free pass) rather than letting it
 * propagate as NaN - a real gap for runs saved before marginRatio existed
 * on stress-lab requirement results, and NaN silently serializes to null
 * in storage, which then fails strict schema validation on read.
 */
function runMargin(run: StressRunOutcome): number {
  if (run.requirementResults.length === 0) return 0;
  return Math.min(...run.requirementResults.map((r) => (Number.isFinite(r.marginRatio) ? r.marginRatio : 0)));
}

/**
 * Resilience component of the total score: a continuous share per stress
 * test the scenario offers (spec: margin-based, not binary pass/fail), so
 * comfortably clearing every requirement scores higher than barely
 * clearing them, and both score higher than a fully failed run. Only a run
 * at the test's own authored default parameters qualifies - weakening the
 * test (less traffic, a shorter failure window, ...) to inflate the margin
 * earns no credit, even though the run itself still shows up in Stress Lab
 * run history. Across multiple qualifying runs, the best margin counts.
 * `testDefinitions: []` (a scenario with no Stress Lab) returns 0/0, never
 * lowering that scenario's max score.
 */
export function evaluateResilience(testDefinitions: StressProfile[], runs: StressRunOutcome[]): ResilienceEvaluation {
  if (testDefinitions.length === 0) {
    return { resilienceScore: 0, maxResilienceScore: 0, resilienceTestResults: [] };
  }

  const resilienceTestResults = testDefinitions.map((profile) => {
    const qualifying = runs.filter((run) => run.testId === profile.id && ranAtDefaultParameters(profile, run.parameters));
    const marginScore = qualifying.length > 0 ? Math.max(...qualifying.map(runMargin)) : 0;
    return { testId: profile.id, label: profile.label, marginScore, passedAtDefaultParameters: marginScore > 0 };
  });

  const totalShare = resilienceTestResults.reduce((sum, r) => sum + r.marginScore, 0);
  const resilienceScore = Math.round(MAX_RESILIENCE_SCORE * (totalShare / testDefinitions.length) * 10) / 10;

  return { resilienceScore, maxResilienceScore: MAX_RESILIENCE_SCORE, resilienceTestResults };
}

/** Combines both halves into the full result once both are known - the only place totalScore/maxTotalScore are computed. */
export function combineScenarioEvaluation(
  written: WrittenResponseEvaluation,
  resilience: ResilienceEvaluation,
): ScenarioEvaluationResult {
  return {
    ...written,
    ...resilience,
    totalScore: written.objectiveScore + resilience.resilienceScore,
    maxTotalScore: written.maxObjectiveScore + resilience.maxResilienceScore,
  };
}
