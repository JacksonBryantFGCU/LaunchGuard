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

export const ScenarioEvaluationResultSchema = z.object({
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
export type ScenarioEvaluationResult = z.infer<typeof ScenarioEvaluationResultSchema>;
