import { z } from "zod";
import { ScenarioSeveritySchema } from "./scenarioResponse.js";

// Public scenario-based practice domain. The architecture diagram is one
// optional investigation resource among several - deliberately no
// mandatory nodeIds/edgeIds here, unlike PublicArchitectureScenario.

export const InvestigationResourceTypeSchema = z.enum([
  "architecture",
  "requirements",
  "constraints",
  "evidence",
  "architect",
]);
export type InvestigationResourceType = z.infer<typeof InvestigationResourceTypeSchema>;

export const PracticeScenarioSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),

  title: z.string().min(1),
  shortDescription: z.string().min(1),

  situation: z.string().min(1),
  objective: z.string().min(1),

  requirementIds: z.array(z.string().min(1)),

  investigationPrompts: z.array(z.string().min(1)).min(1),
  availableResourceTypes: z.array(InvestigationResourceTypeSchema).min(1),

  estimatedMinutes: z.number().int().positive().optional(),
});
export type PracticeScenario = z.infer<typeof PracticeScenarioSchema>;

// Deterministic objective evaluation, safe to send after submission. Never
// carries expectedConcepts/rubric/teaching-answer content - z.object()
// strips any such field on parse, which is itself the private->public
// projection (same allow-list pattern as StressTestRevealSchema).

export const ConceptCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  matched: z.boolean(),
  teaching: z.string().min(1),
});
export type ConceptCheck = z.infer<typeof ConceptCheckSchema>;

// The written-response rubric (16 pts) - what evaluateScenarioResponse
// produces on its own, before anything from the Stress Lab is known.
export const WrittenResponseEvaluationSchema = z.object({
  scenarioId: z.string().min(1),

  objectiveScore: z.number().int().min(0).max(16),
  maxObjectiveScore: z.literal(16),

  diagnosisScore: z.number().int().min(0).max(6),
  evidenceRequirementScore: z.number().int().min(0).max(4),
  immediateActionScore: z.number().int().min(0).max(3),
  architectureDecisionScore: z.number().int().min(0).max(3),

  diagnosisConcepts: z.array(ConceptCheckSchema),
  immediateActionConcepts: z.array(ConceptCheckSchema),
  architectureDecisionConcepts: z.array(ConceptCheckSchema),

  matchedRequirementIds: z.array(z.string().min(1)),
  missedRequirementIds: z.array(z.string().min(1)),
  evidenceUsed: z.boolean(),

  submittedSeverity: ScenarioSeveritySchema,
  expectedSeverity: ScenarioSeveritySchema,
  severityAligned: z.boolean(),
});
export type WrittenResponseEvaluation = z.infer<typeof WrittenResponseEvaluationSchema>;

export const ResilienceTestOutcomeSchema = z.object({
  testId: z.string().min(1),
  label: z.string().min(1),
  // Passing only counts at the test's authored default parameters -
  // weakening the test (less traffic, a shorter failure window, ...) to
  // force a pass earns no credit here, even though the run itself is
  // still saved and visible in Stress Lab run history.
  passedAtDefaultParameters: z.boolean(),
});
export type ResilienceTestOutcome = z.infer<typeof ResilienceTestOutcomeSchema>;

// The Stress Lab component of the score (8 pts) - one point share per
// stress test the scenario offers, earned by passing it at default
// parameters at least once before submitting. 0/0 for a scenario with no
// Stress Lab at all, so it never lowers that scenario's max score.
export const ResilienceEvaluationSchema = z.object({
  resilienceScore: z.number().int().min(0).max(8),
  maxResilienceScore: z.union([z.literal(0), z.literal(8)]),
  resilienceTestResults: z.array(ResilienceTestOutcomeSchema),
});
export type ResilienceEvaluation = z.infer<typeof ResilienceEvaluationSchema>;

// The full result: written response + resilience, combined server-side
// once both are known (see combineScenarioEvaluation in @redline/scenarios)
// - never computed twice or partially on the client.
export const ScenarioEvaluationResultSchema = WrittenResponseEvaluationSchema.merge(ResilienceEvaluationSchema).extend({
  totalScore: z.number().int().nonnegative(),
  maxTotalScore: z.number().int().positive(),
});
export type ScenarioEvaluationResult = z.infer<typeof ScenarioEvaluationResultSchema>;
