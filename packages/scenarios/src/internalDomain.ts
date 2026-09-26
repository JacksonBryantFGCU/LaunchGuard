import { z } from "zod";
import { PublicReviewScenarioSchema } from "@redline/shared";

export const IssueSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const IssueCategorySchema = z.enum([
  "data-integrity",
  "reliability",
  "performance",
  "concurrency",
  "maintainability",
  "architecture",
  "testing",
]);
export type IssueCategory = z.infer<typeof IssueCategorySchema>;

export const HiddenIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: IssueCategorySchema,
  severity: IssueSeveritySchema,
  description: z.string(),
  affectedFile: z.string(),
  affectedLines: z.object({ start: z.number().int().positive(), end: z.number().int().positive() }),
  evidence: z.string(),
  expectedReviewerInsight: z.string(),
});
export type HiddenIssue = z.infer<typeof HiddenIssueSchema>;

export const HiddenTestStatusSchema = z.enum(["pass", "fail"]);
export type HiddenTestStatus = z.infer<typeof HiddenTestStatusSchema>;

export const HiddenTestSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: HiddenTestStatusSchema,
  revealsIssueIds: z.array(z.string()),
  expected: z.string(),
  observed: z.string(),
  explanation: z.string(),
});
export type HiddenTest = z.infer<typeof HiddenTestSchema>;

export const DeveloperPersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  behavior: z.string(),
  summary: z.string(),
  rationale: z.array(z.string()),
  knownImplementationFacts: z.array(z.string()),
});
export type DeveloperPersona = z.infer<typeof DeveloperPersonaSchema>;

export const EvaluationDimensionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  weight: z.number().positive(),
});
export type EvaluationDimension = z.infer<typeof EvaluationDimensionSchema>;

export const EvaluationRubricSchema = z.object({
  dimensions: z.array(EvaluationDimensionSchema),
});
export type EvaluationRubric = z.infer<typeof EvaluationRubricSchema>;

// Extends the public shape with server-only scenario truth. Never export this
// schema (or values built from it) from a module the frontend imports.
export const InternalReviewScenarioSchema = PublicReviewScenarioSchema.extend({
  developerPersona: DeveloperPersonaSchema,
  hiddenIssues: z.array(HiddenIssueSchema),
  hiddenTests: z.array(HiddenTestSchema),
  evaluationRubric: EvaluationRubricSchema,
});
export type InternalReviewScenario = z.infer<typeof InternalReviewScenarioSchema>;
