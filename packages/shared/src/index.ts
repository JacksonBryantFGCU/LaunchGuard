import { z } from "zod";

export const FindingSeverity = z.enum(["info", "low", "medium", "high", "critical"]);
export type FindingSeverity = z.infer<typeof FindingSeverity>;

export const FindingCategory = z.enum([
  "configuration",
  "security",
  "reliability",
  "operability",
  "dependencies",
]);
export type FindingCategory = z.infer<typeof FindingCategory>;

export const Evidence = z.object({
  description: z.string(),
  file: z.string().optional(),
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

// --- Repository analysis: observed facts only, no rule conclusions ---

export const RepositoryInfo = z.object({
  owner: z.string(),
  name: z.string(),
  url: z.string(),
});
export type RepositoryInfo = z.infer<typeof RepositoryInfo>;

export const PackageManager = z.enum(["npm", "pnpm", "yarn", "bun", "unknown"]);
export type PackageManager = z.infer<typeof PackageManager>;

/** Frameworks that imply a running HTTP server (relevant to start-script/health-check rules). */
export const SERVER_FRAMEWORKS = new Set(["Express", "NestJS", "Next.js"]);

export const ProjectInfo = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  packageManager: PackageManager,
  isNodeProject: z.boolean(),
});
export type ProjectInfo = z.infer<typeof ProjectInfo>;

export const ManifestInfo = z.object({
  name: z.string().optional(),
  scripts: z.record(z.string(), z.string()),
  dependencies: z.record(z.string(), z.string()),
  devDependencies: z.record(z.string(), z.string()),
  engines: z.record(z.string(), z.string()),
  packageManagerField: z.string().optional(),
  parseError: z.string().optional(),
});
export type ManifestInfo = z.infer<typeof ManifestInfo>;

export const ConfigFileInfo = z.object({
  path: z.string(),
  kind: z.string(),
});
export type ConfigFileInfo = z.infer<typeof ConfigFileInfo>;

export const PotentialSecret = z.object({
  file: z.string(),
  pattern: z.string(),
});
export type PotentialSecret = z.infer<typeof PotentialSecret>;

export const RepositorySignals = z.object({
  corsWildcardFiles: z.array(z.string()),
});
export type RepositorySignals = z.infer<typeof RepositorySignals>;

export const ScanWarning = z.object({
  code: z.string(),
  message: z.string(),
});
export type ScanWarning = z.infer<typeof ScanWarning>;

export const RepositoryStatistics = z.object({
  filesSeen: z.number(),
  filesAnalyzed: z.number(),
  truncated: z.boolean(),
});
export type RepositoryStatistics = z.infer<typeof RepositoryStatistics>;

export const RepositoryAnalysis = z.object({
  repository: RepositoryInfo,
  project: ProjectInfo,
  files: z.array(z.string()),
  manifest: ManifestInfo.optional(),
  configuration: z.array(ConfigFileInfo),
  potentialSecrets: z.array(PotentialSecret),
  signals: RepositorySignals,
  statistics: RepositoryStatistics,
  warnings: z.array(ScanWarning),
});
export type RepositoryAnalysis = z.infer<typeof RepositoryAnalysis>;

export const RuleContext = z.object({
  analysis: RepositoryAnalysis,
});
export type RuleContext = z.infer<typeof RuleContext>;

/** A rule either finds something (a Finding) or has nothing to report. */
export type RuleResult = Finding | null;

export const RepositoryScanRequest = z.object({
  repositoryUrl: z.string(),
});
export type RepositoryScanRequest = z.infer<typeof RepositoryScanRequest>;

export const ScanSummary = z.object({
  totalFindings: z.number(),
  bySeverity: z.record(FindingSeverity, z.number()),
  byCategory: z.record(FindingCategory, z.number()),
});
export type ScanSummary = z.infer<typeof ScanSummary>;

export const ScanResult = z.object({
  repository: RepositoryInfo,
  project: ProjectInfo,
  scannedAt: z.string(),
  findings: z.array(Finding),
  summary: ScanSummary,
  statistics: RepositoryStatistics,
  warnings: z.array(ScanWarning),
});
export type ScanResult = z.infer<typeof ScanResult>;
