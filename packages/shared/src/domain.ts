import { z } from "zod";

export const ScenarioDifficultySchema = z.enum(["junior", "mid", "senior"]);
export type ScenarioDifficulty = z.infer<typeof ScenarioDifficultySchema>;

export const ScenarioCategorySchema = z.enum([
  "reliability",
  "data-integrity",
  "security",
  "performance",
  "architecture",
]);
export type ScenarioCategory = z.infer<typeof ScenarioCategorySchema>;

export const CiStatusSchema = z.enum(["passing", "failing", "pending"]);
export type CiStatus = z.infer<typeof CiStatusSchema>;

export const FileChangeStatusSchema = z.enum(["added", "modified", "removed"]);
export type FileChangeStatus = z.infer<typeof FileChangeStatusSchema>;

export const ScenarioFileSchema = z.object({
  path: z.string(),
  status: FileChangeStatusSchema,
  language: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  oldContent: z.string(),
  newContent: z.string(),
});
export type ScenarioFile = z.infer<typeof ScenarioFileSchema>;

export const PullRequestSummarySchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  ciStatus: CiStatusSchema,
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});
export type PullRequestSummary = z.infer<typeof PullRequestSummarySchema>;

export const ScenarioPreviewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: ScenarioDifficultySchema,
  categories: z.array(ScenarioCategorySchema),
  prNumber: z.number().int().positive(),
  ciStatus: CiStatusSchema,
  filesChanged: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});
export type ScenarioPreview = z.infer<typeof ScenarioPreviewSchema>;

export const PublicReviewScenarioSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: ScenarioDifficultySchema,
  categories: z.array(ScenarioCategorySchema),
  pullRequest: PullRequestSummarySchema,
  files: z.array(ScenarioFileSchema),
});
export type PublicReviewScenario = z.infer<typeof PublicReviewScenarioSchema>;
