import crypto from "node:crypto";
import { ReviewSubmissionSchema, type ReviewSubmission, type ReviewSubmissionResult } from "@redline/shared";
import { getScenarioBySlug } from "./scenarioService.js";

export class ReviewValidationError extends Error {}

export function submitReview(input: unknown): ReviewSubmissionResult {
  const submission: ReviewSubmission = ReviewSubmissionSchema.parse(input);

  const scenario = getScenarioBySlug(submission.scenarioSlug);
  if (!scenario) {
    throw new ReviewValidationError(`Unknown scenario: ${submission.scenarioSlug}`);
  }

  const knownPaths = new Set(scenario.files.map((f) => f.path));

  for (const file of submission.reviewedFiles) {
    if (!knownPaths.has(file)) {
      throw new ReviewValidationError(`Reviewed file does not exist in this scenario: ${file}`);
    }
  }

  for (const comment of submission.comments) {
    if (!knownPaths.has(comment.file)) {
      throw new ReviewValidationError(`Comment references a file that does not exist in this scenario: ${comment.file}`);
    }
  }

  return {
    reviewId: crypto.randomUUID(),
    scenarioSlug: submission.scenarioSlug,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    decision: submission.decision,
    commentCount: submission.comments.length,
    filesReviewed: new Set(submission.reviewedFiles).size,
    totalFiles: scenario.files.length,
  };
}
