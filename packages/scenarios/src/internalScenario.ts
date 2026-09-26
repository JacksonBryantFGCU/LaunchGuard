import { z } from "zod";
import {
  ArchitectureRiskCategorySchema,
  PublicArchitectureScenarioSchema,
  NodeEffectSchema,
  EdgeEffectSchema,
  RequirementImpactSchema,
  StressTestRevealSchema,
  type PublicArchitectureScenario,
  type StressTestReveal,
} from "@redline/shared";

// Private scenario truth. Never exported through this package's public
// index.ts, and never sent to the API/frontend - only toPublicScenario()'s
// output is.

export const ArchitectContextSchema = z.object({
  background: z.string().min(1),
  behavior: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  rationale: z.array(z.string().min(1)).min(1),
  knownTradeoffs: z.array(z.string().min(1)).min(1),
  implementationDecisions: z.array(z.string().min(1)).min(1),
});
export type ArchitectContext = z.infer<typeof ArchitectContextSchema>;

export const HiddenRiskSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

export const HiddenRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: ArchitectureRiskCategorySchema,
  severity: HiddenRiskSeveritySchema,
  description: z.string().min(1),
  affectedNodeIds: z.array(z.string().min(1)),
  affectedEdgeIds: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)),
  requirementIds: z.array(z.string().min(1)),
  expectedReviewerInsight: z.string().min(1),
  matchingConcepts: z.array(z.string().min(1)),
});
export type HiddenRisk = z.infer<typeof HiddenRiskSchema>;

export const StressTestStatusSchema = z.enum(["pass", "fail"]);

// Ordered propagation step: an authored point in a stress test's timeline,
// carrying exactly the node/edge/requirement effects the scenario truth
// says are true at that point. The simulator never infers these - only
// steps that resolve to real nodes/edges/requirements pass validation (see
// assertStepsReferenceRealObjects below).
export const StressTestStepSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  nodeEffects: z.array(NodeEffectSchema).default([]),
  edgeEffects: z.array(EdgeEffectSchema).default([]),
  requirementImpacts: z.array(RequirementImpactSchema).default([]),
});
export type StressTestStep = z.infer<typeof StressTestStepSchema>;

export const StressTestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  trigger: z.string().min(1),
  affectedNodes: z.array(z.string().min(1)),
  affectedEdges: z.array(z.string().min(1)),
  status: StressTestStatusSchema,
  revealsRiskIds: z.array(z.string().min(1)),
  expectedBehavior: z.string().min(1),
  observedBehavior: z.string().min(1),
  explanation: z.string().min(1),
  steps: z.array(StressTestStepSchema).min(1),
});
export type StressTest = z.infer<typeof StressTestSchema>;

export const EvaluationRubricDimensionKeySchema = z.enum([
  "criticalRiskDetection",
  "technicalReasoning",
  "requirementAlignment",
  "tradeoffAnalysis",
  "architectQuestioning",
  "finalDecision",
]);

export const EvaluationRubricDimensionSchema = z.object({
  key: EvaluationRubricDimensionKeySchema,
  weight: z.number().int().positive(),
  description: z.string().min(1),
});

export const EvaluationRubricSchema = z
  .object({ dimensions: z.array(EvaluationRubricDimensionSchema).min(1) })
  .refine((rubric) => rubric.dimensions.reduce((sum, d) => sum + d.weight, 0) === 100, {
    message: "evaluation rubric dimension weights must total 100",
  });
export type EvaluationRubric = z.infer<typeof EvaluationRubricSchema>;

export const InternalArchitectureScenarioSchema = PublicArchitectureScenarioSchema.extend({
  architectContext: ArchitectContextSchema,
  hiddenRisks: z.array(HiddenRiskSchema).min(1),
  stressTests: z.array(StressTestSchema).min(1),
  evaluationRubric: EvaluationRubricSchema,
}).superRefine((scenario, ctx) => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  const edgeIds = new Set(scenario.edges.map((e) => e.id));
  const requirementIds = new Set(scenario.requirements.map((r) => r.id));

  for (const stressTest of scenario.stressTests) {
    let previousSequence = 0;
    for (const step of stressTest.steps) {
      if (step.sequence !== previousSequence + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `stress test ${stressTest.id} step ${step.id} has out-of-order sequence ${step.sequence} (expected ${previousSequence + 1})`,
        });
      }
      previousSequence = step.sequence;

      for (const effect of step.nodeEffects) {
        if (!nodeIds.has(effect.nodeId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `stress test ${stressTest.id} step ${step.id} references unknown node ${effect.nodeId}`,
          });
        }
      }
      for (const effect of step.edgeEffects) {
        if (!edgeIds.has(effect.edgeId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `stress test ${stressTest.id} step ${step.id} references unknown edge ${effect.edgeId}`,
          });
        }
      }
      for (const impact of step.requirementImpacts) {
        if (!requirementIds.has(impact.requirementId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `stress test ${stressTest.id} step ${step.id} references unknown requirement ${impact.requirementId}`,
          });
        }
      }
    }
  }
});
export type InternalArchitectureScenario = z.infer<typeof InternalArchitectureScenarioSchema>;

/** Strips private scenario truth, producing exactly what the API/frontend may see. */
export function toPublicScenario(internal: InternalArchitectureScenario): PublicArchitectureScenario {
  // z.object() strips unrecognized keys by default, so this drops
  // architectContext/hiddenRisks/stressTests/evaluationRubric on its own.
  return PublicArchitectureScenarioSchema.parse(internal);
}

/**
 * Reviewer-visible stress-test projection (Phase 5). Parsing each internal
 * StressTest through StressTestRevealSchema strips revealsRiskIds and any
 * other private field by default - the same allow-list pattern as
 * toPublicScenario above. Never forward internal.stressTests directly.
 */
export function toPublicStressTests(internal: InternalArchitectureScenario): StressTestReveal[] {
  return internal.stressTests.map((stressTest) => StressTestRevealSchema.parse(stressTest));
}
