import { z } from "zod";

export const SystemSourceTypeSchema = z.enum(["sample", "manual"]);
export type SystemSourceType = z.infer<typeof SystemSourceTypeSchema>;

export const SystemVisibilitySchema = z.enum(["private", "public"]);
export type SystemVisibility = z.infer<typeof SystemVisibilitySchema>;

// The one shared projection the frontend/API ever see for a System,
// regardless of whether it's a code-authored sample or a database-backed
// user system (see packages/scenarios sampleSystems.ts + apps/api
// systemService.ts, which merge both into this shape).
export const SystemSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  sourceType: SystemSourceTypeSchema,
  visibility: SystemVisibilitySchema,
  ownerUserId: z.string().nullable(),
  componentCount: z.number().int().nonnegative(),
  scenarioCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type SystemSummary = z.infer<typeof SystemSummarySchema>;

export const CreateSystemInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
export type CreateSystemInput = z.infer<typeof CreateSystemInputSchema>;

export const UpdateSystemInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
});
export type UpdateSystemInput = z.infer<typeof UpdateSystemInputSchema>;
