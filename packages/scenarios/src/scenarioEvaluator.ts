import type { ScenarioResponse, ConceptCheck, ScenarioEvaluationResult } from "@redline/shared";
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
): ScenarioEvaluationResult {
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
