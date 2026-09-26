import { z } from "zod";

export const ArchitectureDifficultySchema = z.enum(["mid", "senior", "staff"]);
export type ArchitectureDifficulty = z.infer<typeof ArchitectureDifficultySchema>;

export const ArchitectureFocusSchema = z.enum([
  "reliability",
  "scalability",
  "data-integrity",
  "security",
  "performance",
  "cost",
]);
export type ArchitectureFocus = z.infer<typeof ArchitectureFocusSchema>;

export const ArchitectureNodeCategorySchema = z.enum([
  "client",
  "gateway",
  "load-balancer",
  "service",
  "database",
  "cache",
  "queue",
  "worker",
  "external",
  "observability",
]);
export type ArchitectureNodeCategory = z.infer<typeof ArchitectureNodeCategorySchema>;

export const ArchitectureNodeSchema = z.object({
  id: z.string().min(1),
  category: ArchitectureNodeCategorySchema,
  label: z.string().min(1),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  summary: z.string().min(1),
});
export type ArchitectureNode = z.infer<typeof ArchitectureNodeSchema>;

export const ArchitectureConnectionModeSchema = z.enum(["synchronous", "asynchronous", "read", "write", "read-write"]);
export type ArchitectureConnectionMode = z.infer<typeof ArchitectureConnectionModeSchema>;

export const ArchitectureEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().min(1),
  protocol: z.string().min(1),
  mode: ArchitectureConnectionModeSchema,
});
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

// Richer inspector-only facts, one entry per node/edge. Optional facts are
// left out entirely rather than padding every component with null fields.
export const ArchitectureComponentDetailsSchema = z.object({
  nodeId: z.string().min(1),
  runtime: z.string().optional(),
  instances: z.number().int().positive().optional(),
  region: z.string().optional(),
  scalingPolicy: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  dataOwned: z.array(z.string()).default([]),
});
export type ArchitectureComponentDetails = z.infer<typeof ArchitectureComponentDetailsSchema>;

export const ArchitectureConnectionDetailsSchema = z.object({
  edgeId: z.string().min(1),
  timeout: z.string().optional(),
  retryPolicy: z.string().optional(),
  authentication: z.string().optional(),
  payload: z.string().optional(),
  consistency: z.string().optional(),
});
export type ArchitectureConnectionDetails = z.infer<typeof ArchitectureConnectionDetailsSchema>;

export const ArchitectureRequirementAreaSchema = z.enum([
  "functional",
  "availability",
  "latency",
  "throughput",
  "durability",
  "recovery",
  "security",
  "compliance",
  "cost",
  "operational",
]);
export type ArchitectureRequirementArea = z.infer<typeof ArchitectureRequirementAreaSchema>;

export const ArchitectureRequirementSchema = z.object({
  id: z.string().min(1),
  area: ArchitectureRequirementAreaSchema,
  summary: z.string().min(1),
  target: z.string().optional(),
});
export type ArchitectureRequirement = z.infer<typeof ArchitectureRequirementSchema>;

export const ArchitectureConstraintSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
});
export type ArchitectureConstraint = z.infer<typeof ArchitectureConstraintSchema>;

export const ArchitectureEvidenceItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
});
export type ArchitectureEvidenceItem = z.infer<typeof ArchitectureEvidenceItemSchema>;

export const ArchitectDisplayProfileSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
});
export type ArchitectDisplayProfile = z.infer<typeof ArchitectDisplayProfileSchema>;

// Shared by hidden risks (private scenario truth) and reviewer-authored
// redlines, so both speak the same vocabulary.
export const ArchitectureRiskCategorySchema = z.enum([
  "reliability",
  "scalability",
  "data-integrity",
  "security",
  "performance",
  "operability",
  "resilience",
  "cost",
]);
export type ArchitectureRiskCategory = z.infer<typeof ArchitectureRiskCategorySchema>;

export const RedlineSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type RedlineSeverity = z.infer<typeof RedlineSeveritySchema>;

export const RedlineTargetTypeSchema = z.enum(["node", "edge"]);
export type RedlineTargetType = z.infer<typeof RedlineTargetTypeSchema>;

// A reviewer-authored annotation. Severity/category are the reviewer's own
// judgement - never derived from hidden scenario truth.
export const RedlineSchema = z.object({
  id: z.string().min(1),
  targetType: RedlineTargetTypeSchema,
  targetId: z.string().min(1),
  category: ArchitectureRiskCategorySchema,
  severity: RedlineSeveritySchema,
  title: z.string().min(3).max(140),
  reasoning: z.string().min(10).max(2000),
  createdAt: z.string().min(1),
});
export type Redline = z.infer<typeof RedlineSchema>;

export const ArchitectureScenarioPreviewSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  reviewCode: z.string().min(1),
  description: z.string().min(1),
  difficulty: ArchitectureDifficultySchema,
  focusAreas: z.array(ArchitectureFocusSchema),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
});
export type ArchitectureScenarioPreview = z.infer<typeof ArchitectureScenarioPreviewSchema>;

// Reviewer-visible scenario data. Future private scenario truth (hidden
// risks, stress-test outcomes, architect rationale, evaluation rubric) is
// deliberately never part of this schema - it will live in a separate
// internal type in packages/scenarios, the same public/private split used
// for the earlier PR-review product.
export const PublicArchitectureScenarioSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  reviewCode: z.string().min(1),
  description: z.string().min(1),
  difficulty: ArchitectureDifficultySchema,
  focusAreas: z.array(ArchitectureFocusSchema),
  status: z.string().min(1),
  architect: ArchitectDisplayProfileSchema,

  // Teaching metadata: explains the task, never the answers.
  reviewerRole: z.string().min(1),
  learningObjective: z.string().min(1),
  instructions: z.array(z.string().min(1)).min(1),
  expectedDeliverables: z.array(z.string().min(1)).min(1),

  requirements: z.array(ArchitectureRequirementSchema),
  constraints: z.array(ArchitectureConstraintSchema),
  evidence: z.array(ArchitectureEvidenceItemSchema),
  nodes: z.array(ArchitectureNodeSchema),
  edges: z.array(ArchitectureEdgeSchema),
  componentDetails: z.array(ArchitectureComponentDetailsSchema),
  connectionDetails: z.array(ArchitectureConnectionDetailsSchema),
});
export type PublicArchitectureScenario = z.infer<typeof PublicArchitectureScenarioSchema>;
