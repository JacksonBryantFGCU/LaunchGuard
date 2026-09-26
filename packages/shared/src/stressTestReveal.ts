import { z } from "zod";

// Reviewer-visible stress-test domain (Phase 5). Shared vocabulary for node/
// edge/requirement effects, reused by the private authored fixtures in
// packages/scenarios and by this public reveal projection. Deliberately
// excludes revealsRiskIds, hidden-risk ids, expectedReviewerInsight,
// matchingConcepts, and the evaluation rubric - those remain private
// (Phase 6 answer-key material).

export const NodeEffectStateSchema = z.enum(["normal", "degraded", "saturated", "unavailable", "recovering"]);
export type NodeEffectState = z.infer<typeof NodeEffectStateSchema>;

export const EdgeEffectStateSchema = z.enum(["normal", "degraded", "backlogged", "timed_out", "unavailable"]);
export type EdgeEffectState = z.infer<typeof EdgeEffectStateSchema>;

export const RequirementImpactStatusSchema = z.enum(["met", "at_risk", "violated"]);
export type RequirementImpactStatus = z.infer<typeof RequirementImpactStatusSchema>;

export const NodeEffectSchema = z.object({
  nodeId: z.string().min(1),
  state: NodeEffectStateSchema,
  metricLabel: z.string().min(1).optional(),
  metricValue: z.string().min(1).optional(),
  explanation: z.string().min(1),
});
export type NodeEffect = z.infer<typeof NodeEffectSchema>;

export const EdgeEffectSchema = z.object({
  edgeId: z.string().min(1),
  state: EdgeEffectStateSchema,
  metricLabel: z.string().min(1).optional(),
  metricValue: z.string().min(1).optional(),
  explanation: z.string().min(1),
});
export type EdgeEffect = z.infer<typeof EdgeEffectSchema>;

export const RequirementImpactSchema = z.object({
  requirementId: z.string().min(1),
  status: RequirementImpactStatusSchema,
  observedValue: z.string().min(1).optional(),
  explanation: z.string().min(1),
});
export type RequirementImpact = z.infer<typeof RequirementImpactSchema>;

export const StressTestStepRevealSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  nodeEffects: z.array(NodeEffectSchema).default([]),
  edgeEffects: z.array(EdgeEffectSchema).default([]),
  requirementImpacts: z.array(RequirementImpactSchema).default([]),
});
export type StressTestStepReveal = z.infer<typeof StressTestStepRevealSchema>;

export const StressTestRevealStatusSchema = z.enum(["pass", "fail"]);

// z.object() strips any unrecognized key (revealsRiskIds, expectedReviewerInsight,
// matchingConcepts, evaluationRubric, ...) by default, so parsing an internal
// StressTest through this schema is itself the private->public projection.
export const StressTestRevealSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  trigger: z.string().min(1),
  status: StressTestRevealStatusSchema,
  steps: z.array(StressTestStepRevealSchema).min(1),
  expectedBehavior: z.string().min(1),
  observedBehavior: z.string().min(1),
  explanation: z.string().min(1),
});
export type StressTestReveal = z.infer<typeof StressTestRevealSchema>;

export const StressTestRevealListSchema = z.object({
  reviewId: z.string().min(1),
  scenarioSlug: z.string().min(1),
  tests: z.array(StressTestRevealSchema),
});
export type StressTestRevealList = z.infer<typeof StressTestRevealListSchema>;
