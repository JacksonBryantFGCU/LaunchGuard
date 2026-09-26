import { z } from "zod";
import { TranscriptEntrySchema, TRANSCRIPT_MAX_ENTRIES } from "./voiceDomain.js";

export const ReviewDecisionSchema = z.enum(["approve", "comment", "request_changes", "block_release"]);
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export const REVIEW_COMMENT_MAX_LENGTH = 2000;
export const REVIEWER_NOTES_MAX_LENGTH = 5000;
export const FINAL_EXPLANATION_MIN_LENGTH = 10;
export const FINAL_EXPLANATION_MAX_LENGTH = 4000;

export const ReviewSubmissionCommentSchema = z
  .object({
    id: z.string().min(1),
    file: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    body: z.string().min(1).max(REVIEW_COMMENT_MAX_LENGTH),
  })
  .refine((comment) => comment.endLine >= comment.startLine, {
    message: "endLine must be greater than or equal to startLine",
    path: ["endLine"],
  });
export type ReviewSubmissionComment = z.infer<typeof ReviewSubmissionCommentSchema>;

// Describes what the HUMAN reviewer did and decided - never the scenario
// answer key. Kept as a plain object (no .strict()) so a later phase can add
// an optional field, e.g. conversation evidence from the voice phase, without
// reshaping this contract.
export const ReviewSubmissionSchema = z.object({
  scenarioSlug: z.string().min(1),
  reviewedFiles: z.array(z.string().min(1)),
  comments: z.array(ReviewSubmissionCommentSchema),
  reviewerNotes: z.string().max(REVIEWER_NOTES_MAX_LENGTH).default(""),
  decision: ReviewDecisionSchema,
  finalExplanation: z.string().min(FINAL_EXPLANATION_MIN_LENGTH).max(FINAL_EXPLANATION_MAX_LENGTH),
  transcript: z.array(TranscriptEntrySchema).max(TRANSCRIPT_MAX_ENTRIES).default([]),
});
export type ReviewSubmission = z.infer<typeof ReviewSubmissionSchema>;

export const ReviewSubmissionResultSchema = z.object({
  reviewId: z.string(),
  scenarioSlug: z.string(),
  status: z.literal("submitted"),
  submittedAt: z.string(),
  decision: ReviewDecisionSchema,
  commentCount: z.number().int().nonnegative(),
  filesReviewed: z.number().int().nonnegative(),
  totalFiles: z.number().int().nonnegative(),
});
export type ReviewSubmissionResult = z.infer<typeof ReviewSubmissionResultSchema>;
