import { z } from "zod";

export const FindingSeverity = z.enum(["info", "low", "medium", "high", "critical"]);
export type FindingSeverity = z.infer<typeof FindingSeverity>;

export const FindingCategory = z.enum([
  "configuration",
  "security",
  "reliability",
  "operability",
]);
export type FindingCategory = z.infer<typeof FindingCategory>;

export const Evidence = z.object({
  description: z.string(),
  source: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

export const Finding = z.object({
  ruleId: z.string(),
  title: z.string(),
  severity: FindingSeverity,
  category: FindingCategory,
  explanation: z.string(),
  remediation: z.string(),
  evidence: z.array(Evidence),
});
export type Finding = z.infer<typeof Finding>;

/**
 * Phase 1 supplies controlled project metadata directly instead of
 * inspecting a real repository (that's packages/scanner, a later phase).
 */
export const ProjectMetadata = z.object({
  name: z.string().min(1),
  hasEnvExample: z.boolean(),
  hasBuildScript: z.boolean(),
  hasStartScript: z.boolean(),
  hasHealthCheck: z.boolean(),
  corsOrigins: z.array(z.string()).optional(),
});
export type ProjectMetadata = z.infer<typeof ProjectMetadata>;

export const ScanRequest = z.object({
  project: ProjectMetadata,
});
export type ScanRequest = z.infer<typeof ScanRequest>;

export const RuleContext = z.object({
  project: ProjectMetadata,
});
export type RuleContext = z.infer<typeof RuleContext>;

/** A rule either finds something (a Finding) or has nothing to report. */
export type RuleResult = Finding | null;

export const ScanSummary = z.object({
  totalFindings: z.number(),
  bySeverity: z.record(FindingSeverity, z.number()),
  byCategory: z.record(FindingCategory, z.number()),
});
export type ScanSummary = z.infer<typeof ScanSummary>;

export const ScanResult = z.object({
  projectName: z.string(),
  scannedAt: z.string(),
  findings: z.array(Finding),
  summary: ScanSummary,
});
export type ScanResult = z.infer<typeof ScanResult>;
