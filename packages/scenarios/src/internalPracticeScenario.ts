import { z } from "zod";
import { PracticeScenarioSchema, ScenarioSeveritySchema, type PracticeScenario } from "@purgatory/shared";

// Private practice-scenario truth. Never exported through this package's
// public index.ts, and never sent to the API/frontend before submission -
// only toPublicPracticeScenario()'s output is.

// A small authored group of phrases that represent one concept (e.g.
// "bounded timeout" / "fail fast" / "request timeout" all count as the
// same concept). Matching is deliberately a case-insensitive substring
// check, not embeddings or NLP - see scenarioEvaluator.ts.
export const ConceptGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  phrases: z.array(z.string().min(1)).min(1),
  teaching: z.string().min(1),
});
export type ConceptGroup = z.infer<typeof ConceptGroupSchema>;

export const InternalPracticeScenarioSchema = z.object({
  publicScenario: PracticeScenarioSchema,

  expectedConcepts: z.array(ConceptGroupSchema).min(1),
  acceptedInvestigationConcepts: z.array(ConceptGroupSchema).min(1),
  acceptedImmediateActionConcepts: z.array(ConceptGroupSchema).min(1),
  acceptedArchitectureDecisionConcepts: z.array(ConceptGroupSchema).min(1),

  severityTruth: ScenarioSeveritySchema,

  linkedHiddenRiskIds: z.array(z.string().min(1)),
  // Legacy narrative stress-test-reveal correlation (packages/scenarios/src/black-friday-checkout/internal.ts's stressTests, unlocked after submission) - a different id namespace and a different subsystem from stressLabTestIds below.
  linkedStressTestIds: z.array(z.string().min(1)).min(1),
  // Interactive Stress Lab test ids (packages/scenarios/src/stressLab/blackFridayStressLab.ts's blackFridayTestDefinitions) this scenario offers.
  // Empty is a valid, intentional value: a scenario with no technically
  // meaningful current stress-lab test (e.g. duplicate-checkout-requests,
  // which needs a retry/idempotency simulation the engine doesn't have yet)
  // stays empty rather than being mapped to an unrelated test.
  stressLabTestIds: z.array(z.string().min(1)).default([]),

  expectedRequirementIds: z.array(z.string().min(1)).min(1),
  relevantEvidenceIds: z.array(z.string().min(1)),
});
export type InternalPracticeScenario = z.infer<typeof InternalPracticeScenarioSchema>;

/** Strips private scenario truth, producing exactly what the API/frontend may see before submission. */
export function toPublicPracticeScenario(internal: InternalPracticeScenario): PracticeScenario {
  return PracticeScenarioSchema.parse(internal.publicScenario);
}
