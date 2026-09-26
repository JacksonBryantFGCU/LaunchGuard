import { z } from "zod";
import { RedlineSchema } from "./architectureDomain.js";
import { ArchitectConversationEvidenceSchema } from "./conversationTranscript.js";

export const ArchitectureRecommendationSchema = z.enum([
  "approve",
  "approve_with_conditions",
  "request_redesign",
  "block_release",
]);
export type ArchitectureRecommendation = z.infer<typeof ArchitectureRecommendationSchema>;

// The complete human review. Bounds are generous relative to a ~10 node /
// ~10 edge scenario, so a real review never hits them but a scripted flood
// of fake redlines/ids does. A future architect-conversation evidence field
// can be added later via .extend() without breaking this contract.
export const ArchitectureReviewSubmissionSchema = z.object({
  scenarioSlug: z.string().min(1),
  reviewedNodeIds: z.array(z.string().min(1)).max(50),
  reviewedEdgeIds: z.array(z.string().min(1)).max(50),
  redlines: z.array(RedlineSchema).max(100),
  reviewerNotes: z.string().max(5000),
  recommendation: ArchitectureRecommendationSchema,
  finalRationale: z.string().min(20).max(5000),
  // Optional: voice is never mandatory to complete a review. Only normalized
  // Redline transcript evidence - never raw ElevenLabs provider payloads.
  architectConversationEvidence: ArchitectConversationEvidenceSchema.optional(),
});
export type ArchitectureReviewSubmission = z.infer<typeof ArchitectureReviewSubmissionSchema>;

// Server-generated result. reviewId/submittedAt are never trusted from the
// client - this schema is also used to allow-list the API response.
export const ArchitectureReviewResultSchema = z.object({
  reviewId: z.string().min(1),
  scenarioSlug: z.string().min(1),
  status: z.literal("submitted"),
  submittedAt: z.string().min(1),
  recommendation: ArchitectureRecommendationSchema,
  redlineCount: z.number().int().nonnegative(),
  reviewedNodeCount: z.number().int().nonnegative(),
  totalNodeCount: z.number().int().nonnegative(),
  reviewedEdgeCount: z.number().int().nonnegative(),
  totalEdgeCount: z.number().int().nonnegative(),
});
export type ArchitectureReviewResult = z.infer<typeof ArchitectureReviewResultSchema>;
