import { z } from "zod";
import { ScenarioSeveritySchema, ScenarioConfidenceSchema } from "./scenarioResponse.js";
import { ScenarioEvaluationResultSchema } from "./practiceScenario.js";

// API-facing projections that connect the Phase 1 domain and Phase 2
// persistence to the frontend. These are transport shapes, not new scoring
// models - the evaluation itself stays in packages/scenarios.

export const PracticeScenarioStatusSchema = z.enum([
  "investigating",
  "submitted",
  "feedback_ready",
  "consequence_ready",
  "completed",
]);
export type PracticeScenarioStatus = z.infer<typeof PracticeScenarioStatusSchema>;

export const PracticeEvidenceSourceTypeSchema = z.enum([
  "requirement",
  "constraint",
  "scenario_evidence",
  "architecture_node",
  "architecture_edge",
  "architect_statement",
  "architecture_finding",
]);
export type PracticeEvidenceSourceType = z.infer<typeof PracticeEvidenceSourceTypeSchema>;

export const PracticeEvidenceItemSchema = z.object({
  id: z.string().min(1),
  sourceType: PracticeEvidenceSourceTypeSchema,
  sourceId: z.string().min(1).nullable(),
  label: z.string().min(1),
  content: z.string().min(1),
  transcriptTurnId: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
});
export type PracticeEvidenceItem = z.infer<typeof PracticeEvidenceItemSchema>;

export const PracticeResponseDraftSchema = z.object({
  diagnosis: z.string(),
  investigationPlan: z.string(),
  immediateAction: z.string(),
  architectureDecision: z.string(),
  tradeoff: z.string(),
  severity: ScenarioSeveritySchema.nullable(),
  confidence: ScenarioConfidenceSchema.nullable(),
});
export type PracticeResponseDraft = z.infer<typeof PracticeResponseDraftSchema>;

// Lightweight per-scenario projection for the practice overview list - no
// response/evidence payload, just enough to render status + score.
export const PracticeScenarioAttemptSummarySchema = z.object({
  practiceScenarioId: z.string().min(1),
  status: PracticeScenarioStatusSchema,
  startedAt: z.string().min(1),
  submittedAt: z.string().min(1).nullable(),
  completedAt: z.string().min(1).nullable(),
  objectiveScore: z.number().int().nonnegative().nullable(),
  maxObjectiveScore: z.number().int().positive().nullable(),
});
export type PracticeScenarioAttemptSummary = z.infer<typeof PracticeScenarioAttemptSummarySchema>;

// Full attempt state for the investigation/response/result screens.
export const PracticeScenarioAttemptViewSchema = z.object({
  attemptId: z.string().min(1),
  reviewSessionId: z.string().min(1),
  practiceScenarioId: z.string().min(1),
  status: PracticeScenarioStatusSchema,
  startedAt: z.string().min(1),
  submittedAt: z.string().min(1).nullable(),
  completedAt: z.string().min(1).nullable(),

  response: PracticeResponseDraftSchema,
  affectedRequirementIds: z.array(z.string().min(1)),
  evidence: z.array(PracticeEvidenceItemSchema),
  selectedEvidenceIds: z.array(z.string().min(1)),

  result: ScenarioEvaluationResultSchema.nullable(),
});
export type PracticeScenarioAttemptView = z.infer<typeof PracticeScenarioAttemptViewSchema>;

export const SavePracticeResponseDraftRequestSchema = z.object({
  diagnosis: z.string().max(5000).optional(),
  investigationPlan: z.string().max(5000).optional(),
  immediateAction: z.string().max(5000).optional(),
  architectureDecision: z.string().max(5000).optional(),
  tradeoff: z.string().max(5000).optional(),
  severity: ScenarioSeveritySchema.optional(),
  confidence: ScenarioConfidenceSchema.optional(),
});
export type SavePracticeResponseDraftRequest = z.infer<typeof SavePracticeResponseDraftRequestSchema>;

export const SetPracticeRequirementsRequestSchema = z.object({
  requirementIds: z.array(z.string().min(1)).max(50),
});

export const AddPracticeEvidenceRequestSchema = z.object({
  sourceType: PracticeEvidenceSourceTypeSchema,
  sourceId: z.string().min(1).nullable(),
  label: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  transcriptTurnId: z.string().min(1).optional(),
});
export type AddPracticeEvidenceRequest = z.infer<typeof AddPracticeEvidenceRequestSchema>;

export const SetResponseEvidenceRequestSchema = z.object({
  evidenceIds: z.array(z.string().min(1)).max(50),
});
