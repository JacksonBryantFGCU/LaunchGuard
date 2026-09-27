import { z } from "zod";
import { NodeEffectStateSchema, EdgeEffectStateSchema, RequirementImpactStatusSchema } from "./stressTestReveal.js";

// Interactive Architecture Stress Lab - public domain (Phase 7). Reuses the
// existing node/edge/requirement vocabulary from stressTestReveal.ts rather
// than forking a parallel set of states, so the narrative stress-test reveal
// and the interactive lab speak the same language. Deliberately excludes
// simulation formulas, component capacity numbers, and intervention scoring
// rules - those are private (packages/scenarios/src/stressLab), never
// forwarded to the frontend directly.

export const StressParameterTypeSchema = z.enum(["number", "percentage", "multiplier", "duration", "enum"]);
export type StressParameterType = z.infer<typeof StressParameterTypeSchema>;

export const StressParameterDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  type: StressParameterTypeSchema,
  unit: z.string().min(1).optional(),
  defaultValue: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  editable: z.boolean(),
});
export type StressParameterDefinition = z.infer<typeof StressParameterDefinitionSchema>;

// Extensible stress-test category domain (spec #3). Only "load", "spike",
// "dependency_degradation", "resource_saturation", and "regional_failure"
// are implemented; the rest are reserved so future test types (soak, queue
// backlog, retry storm, ...) slot into the same field without a schema break.
export const StressTestCategorySchema = z.enum([
  "load",
  "spike",
  "dependency_degradation",
  "resource_saturation",
  "regional_failure",
  "soak",
  "queue_backlog",
  "retry_storm",
  "cache_failure",
  "network_degradation",
  "hot_partition",
  "data_consistency",
  "compound_failure",
]);
export type StressTestCategory = z.infer<typeof StressTestCategorySchema>;

// A StressProfile is one stress-test definition: its public parameters plus
// the simulated-time window the engine walks it over (spec #7/#26). A
// scenario has one of these per test type it offers (id distinguishes the
// test, scenarioId groups them).
export const StressProfileSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: StressTestCategorySchema,
  durationSeconds: z.number().int().positive(),
  stepSeconds: z.number().int().positive(),
  parameters: z.array(StressParameterDefinitionSchema).min(1),
});
export type StressProfile = z.infer<typeof StressProfileSchema>;

export const StressParameterValuesSchema = z.record(z.string(), z.number());
export type StressParameterValues = z.infer<typeof StressParameterValuesSchema>;

// Architecture modification domain. Modifications are events layered on top
// of the immutable base architecture, never a mutation of it (spec #15/#42).
export const AddComponentModificationSchema = z.object({
  kind: z.literal("add-component"),
  id: z.string().min(1),
  componentType: z.string().min(1),
  targetNodeId: z.string().min(1).optional(),
  targetEdgeId: z.string().min(1).optional(),
  config: z.record(z.string(), z.number()).default({}),
});
export type AddComponentModification = z.infer<typeof AddComponentModificationSchema>;

export const RemoveLearnerComponentModificationSchema = z.object({
  kind: z.literal("remove-component"),
  modificationId: z.string().min(1),
});
export type RemoveLearnerComponentModification = z.infer<typeof RemoveLearnerComponentModificationSchema>;

export const ConfigureComponentModificationSchema = z.object({
  kind: z.literal("configure-component"),
  modificationId: z.string().min(1),
  config: z.record(z.string(), z.number()),
});
export type ConfigureComponentModification = z.infer<typeof ConfigureComponentModificationSchema>;

export const ArchitectureModificationSchema = z.discriminatedUnion("kind", [
  AddComponentModificationSchema,
  RemoveLearnerComponentModificationSchema,
  ConfigureComponentModificationSchema,
]);
export type ArchitectureModification = z.infer<typeof ArchitectureModificationSchema>;

// Applies remove/configure modifications against add-component modifications
// in the order given, returning only the components still standing with
// their current config. Pure and order-dependent by design: an add followed
// by its own remove nets to nothing, matching "reset design = baseline".
export function resolveActiveComponents(modifications: ArchitectureModification[]): AddComponentModification[] {
  const byId = new Map<string, AddComponentModification>();
  for (const mod of modifications) {
    if (mod.kind === "add-component") {
      byId.set(mod.id, mod);
    } else if (mod.kind === "remove-component") {
      byId.delete(mod.modificationId);
    } else if (mod.kind === "configure-component") {
      const existing = byId.get(mod.modificationId);
      if (existing) {
        byId.set(mod.modificationId, { ...existing, config: { ...existing.config, ...mod.config } });
      }
    }
  }
  return [...byId.values()];
}

// Intervention palette entry - authored, public. Describes what a component
// does and its tradeoffs, never whether it will make a given run pass.
export const InterventionTradeoffSchema = z.object({
  operationalComplexity: z.enum(["low", "medium", "high"]),
  costImpact: z.enum(["low", "medium", "high"]),
  tradeoff: z.string().min(1),
});
export type InterventionTradeoff = z.infer<typeof InterventionTradeoffSchema>;

// A config field is numeric by default (a slider/number input). `options`
// turns it into a labeled enum-like choice (e.g. retry backoff strategy)
// while keeping the underlying value a plain number - no new field-type
// discriminant needed, and every existing configFields entry (no options)
// keeps behaving exactly as before.
export const InterventionConfigFieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
});
export type InterventionConfigFieldOption = z.infer<typeof InterventionConfigFieldOptionSchema>;

export const InterventionConfigFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1).optional(),
  defaultValue: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(InterventionConfigFieldOptionSchema).min(1).optional(),
});
export type InterventionConfigField = z.infer<typeof InterventionConfigFieldSchema>;

export const InterventionTargetSchema = z.object({
  nodeId: z.string().min(1).optional(),
  edgeId: z.string().min(1).optional(),
});
export type InterventionTarget = z.infer<typeof InterventionTargetSchema>;

export const InterventionDefinitionSchema = z.object({
  componentType: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  purpose: z.string().min(1),
  tradeoff: InterventionTradeoffSchema,
  validTargets: z.array(InterventionTargetSchema).min(1),
  configFields: z.array(InterventionConfigFieldSchema).default([]),
});
export type InterventionDefinition = z.infer<typeof InterventionDefinitionSchema>;

// Simulation result - public.
export const SimulationSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type SimulationSeverity = z.infer<typeof SimulationSeveritySchema>;

export const SimulationBottleneckSchema = z.object({
  targetType: z.enum(["node", "edge"]),
  targetId: z.string().min(1),
  metric: z.string().min(1),
  observed: z.string().min(1),
  threshold: z.string().min(1),
  severity: SimulationSeveritySchema,
  explanation: z.string().min(1),
  // Observed causal steps leading to this bottleneck (spec #35), e.g.
  // ["Payment Provider latency", "Checkout in-flight requests", "Checkout
  // utilization"]. A list of what was observed, never a suggested fix.
  causalChain: z.array(z.string()).default([]),
});
export type SimulationBottleneck = z.infer<typeof SimulationBottleneckSchema>;

// Structured numeric metrics alongside the display-ready string metrics
// (spec #32/#33) - only the fields meaningful for that node/edge's type are
// populated, never invented zeros for an incompatible dimension.
export const SimulationNodeStateSchema = z.object({
  nodeId: z.string().min(1),
  state: NodeEffectStateSchema,
  metrics: z.record(z.string(), z.string()).default({}),
  numericMetrics: z.record(z.string(), z.number()).default({}),
  explanation: z.string().min(1),
});
export type SimulationNodeState = z.infer<typeof SimulationNodeStateSchema>;

export const SimulationEdgeStateSchema = z.object({
  edgeId: z.string().min(1),
  state: EdgeEffectStateSchema,
  metrics: z.record(z.string(), z.string()).default({}),
  numericMetrics: z.record(z.string(), z.number()).default({}),
  explanation: z.string().min(1),
});
export type SimulationEdgeState = z.infer<typeof SimulationEdgeStateSchema>;

// A meaningful, human-readable state change worth showing in an event
// timeline (spec #54) - never emitted every frame, only on a real
// transition (e.g. a requirement flipping status, a bottleneck appearing).
export const SimulationEventSchema = z.object({
  atSeconds: z.number().nonnegative(),
  type: z.enum(["traffic_change", "scaling", "saturation", "requirement_change", "failure", "recovery"]),
  message: z.string().min(1),
});
export type SimulationEvent = z.infer<typeof SimulationEventSchema>;

export const SimulationRequirementResultSchema = z.object({
  requirementId: z.string().min(1),
  status: RequirementImpactStatusSchema,
  observedValue: z.string().min(1).optional(),
  explanation: z.string().min(1),
});
export type SimulationRequirementResult = z.infer<typeof SimulationRequirementResultSchema>;

export const ArchitectureSimulationResultSchema = z.object({
  nodeStates: z.array(SimulationNodeStateSchema),
  edgeStates: z.array(SimulationEdgeStateSchema),
  requirementResults: z.array(SimulationRequirementResultSchema).min(1),
  bottlenecks: z.array(SimulationBottleneckSchema),
  systemMetrics: z.record(z.string(), z.number()),
});
export type ArchitectureSimulationResult = z.infer<typeof ArchitectureSimulationResultSchema>;

// One timestamped snapshot within a run's simulated timeline (spec #7).
// Deliberately excludes bottlenecks - those are a whole-run aggregate
// (spec #24), not a per-frame concept.
export const SimulationFrameSchema = z.object({
  timestampSeconds: z.number().nonnegative(),
  nodeStates: z.array(SimulationNodeStateSchema),
  edgeStates: z.array(SimulationEdgeStateSchema),
  requirementResults: z.array(SimulationRequirementResultSchema),
  systemMetrics: z.record(z.string(), z.number()),
  // Events that became true AT this frame (empty for most frames) - the
  // event timeline is just every frame's events concatenated in order.
  events: z.array(SimulationEventSchema).default([]),
});
export type SimulationFrame = z.infer<typeof SimulationFrameSchema>;

// Full result of one stress-test run (spec #26). requirementResults and
// bottlenecks are whole-run aggregates (worst status/severity observed
// across all frames), not just the final frame's - a test that saturates
// mid-run and recovers by the end should still surface as having failed.
export const StressTestTimelineResultSchema = z.object({
  testId: z.string().min(1),
  parameters: StressParameterValuesSchema,
  frames: z.array(SimulationFrameSchema).min(1),
  finalMetrics: z.record(z.string(), z.number()),
  bottlenecks: z.array(SimulationBottleneckSchema),
  requirementResults: z.array(SimulationRequirementResultSchema).min(1),
  passed: z.boolean(),
  summary: z.string().min(1),
});
export type StressTestTimelineResult = z.infer<typeof StressTestTimelineResultSchema>;

// The persisted, immutable run record the API returns from a stress-run
// create/list call (spec #34/#35: parameters + modifications + final
// aggregate only, never the frame timeline). Frontend-only addition to this
// shared package - the API route's response already matched this shape, so
// this just gives the frontend a validated contract to parse through
// instead of duck-typing the response.
export const StressSimulationRunRecordSchema = z.object({
  id: z.string().min(1),
  attemptId: z.string().min(1),
  testId: z.string().min(1),
  runNumber: z.number().int().positive(),
  parameters: StressParameterValuesSchema,
  modifications: z.array(ArchitectureModificationSchema),
  passed: z.boolean(),
  finalMetrics: z.record(z.string(), z.number()),
  requirementResults: z.array(SimulationRequirementResultSchema),
  bottlenecks: z.array(SimulationBottleneckSchema),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});
export type StressSimulationRunRecord = z.infer<typeof StressSimulationRunRecordSchema>;
