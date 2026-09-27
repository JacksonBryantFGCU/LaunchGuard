import { z } from "zod";

// The learner's complete answer to a practice scenario situation. This is
// the primary graded artifact - see packages/scenarios for the private
// scoring truth it is evaluated against.

export const ScenarioSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type ScenarioSeverity = z.infer<typeof ScenarioSeveritySchema>;

export const ScenarioConfidenceSchema = z.enum(["low", "medium", "high"]);
export type ScenarioConfidence = z.infer<typeof ScenarioConfidenceSchema>;

export const ScenarioResponseSchema = z.object({
  diagnosis: z.string().min(1).max(5000),
  investigationPlan: z.string().min(1).max(5000),
  immediateAction: z.string().min(1).max(5000),
  architectureDecision: z.string().min(1).max(5000),
  tradeoff: z.string().min(1).max(5000),

  severity: ScenarioSeveritySchema,
  confidence: ScenarioConfidenceSchema.optional(),

  affectedRequirementIds: z.array(z.string().min(1)).max(50),
  evidenceIds: z.array(z.string().min(1)).max(50),
});
export type ScenarioResponse = z.infer<typeof ScenarioResponseSchema>;
