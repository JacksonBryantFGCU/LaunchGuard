import { z } from "zod";
import { RedlineSchema } from "./architectureDomain.js";
import { ArchitectConversationTurnSchema } from "./conversationTranscript.js";
import { ArchitectureRecommendationSchema } from "./reviewSubmission.js";

export const ReviewSessionStatusSchema = z.enum(["draft", "submitted"]);
export type ReviewSessionStatus = z.infer<typeof ReviewSessionStatusSchema>;

export const StressProgressStatusSchema = z.enum(["not_started", "running", "passed", "failed"]);
export type StressProgressStatus = z.infer<typeof StressProgressStatusSchema>;

export const StressProgressSchema = z.object({
  stressTestId: z.string().min(1),
  status: StressProgressStatusSchema,
  currentStep: z.number().int().nonnegative(),
  completedAt: z.string().min(1).nullable(),
});
export type StressProgress = z.infer<typeof StressProgressSchema>;

// Full draft/submitted state for a review session - enough to restore the
// workspace after a refresh, or render a locked "view submitted review".
export const ReviewSessionSchema = z.object({
  id: z.string().min(1),
  scenarioSlug: z.string().min(1),
  status: ReviewSessionStatusSchema,
  reviewedNodeIds: z.array(z.string().min(1)),
  reviewedEdgeIds: z.array(z.string().min(1)),
  reviewerNotes: z.string(),
  redlines: z.array(RedlineSchema),
  transcript: z.array(ArchitectConversationTurnSchema),
  startedAt: z.string().min(1),
  submittedAt: z.string().min(1).nullable(),
  recommendation: ArchitectureRecommendationSchema.nullable(),
  finalRationale: z.string().nullable(),
  stressProgress: z.array(StressProgressSchema),
});
export type ReviewSession = z.infer<typeof ReviewSessionSchema>;

// Lightweight history-list projection - no transcript/redlines payload.
export const ReviewHistoryItemSchema = z.object({
  reviewId: z.string().min(1),
  scenarioSlug: z.string().min(1),
  status: ReviewSessionStatusSchema,
  startedAt: z.string().min(1),
  submittedAt: z.string().min(1).nullable(),
  redlineCount: z.number().int().nonnegative(),
  stressProgress: z.array(StressProgressSchema),
});
export type ReviewHistoryItem = z.infer<typeof ReviewHistoryItemSchema>;

export const StartReviewSessionRequestSchema = z.object({ scenarioSlug: z.string().min(1) });

export const UpdateDraftRequestSchema = z.object({
  reviewedNodeIds: z.array(z.string().min(1)).max(50).optional(),
  reviewedEdgeIds: z.array(z.string().min(1)).max(50).optional(),
  reviewerNotes: z.string().max(5000).optional(),
});
export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;

export const RedlineDraftPatchSchema = RedlineSchema.omit({ id: true, createdAt: true }).partial();
export type RedlineDraftPatchRequest = z.infer<typeof RedlineDraftPatchSchema>;

export const TranscriptTurnRequestSchema = z.object({
  conversationId: z.string().min(1),
  turn: ArchitectConversationTurnSchema,
});
export type TranscriptTurnRequest = z.infer<typeof TranscriptTurnRequestSchema>;

export const StressProgressRequestSchema = StressProgressSchema;

export const SubmitSessionRequestSchema = z.object({
  recommendation: ArchitectureRecommendationSchema,
  finalRationale: z.string().min(20).max(5000),
});
export type SubmitSessionRequest = z.infer<typeof SubmitSessionRequestSchema>;
