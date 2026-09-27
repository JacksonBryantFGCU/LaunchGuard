import { SubmitSessionRequestSchema, type SubmitSessionRequest } from "@purgatory/shared";
import type { ReviewState } from "./reviewState.js";

export type SubmissionValidationResult =
  | { ok: true; submission: SubmitSessionRequest }
  | { ok: false; errors: Record<string, string> };

// Everything else (redlines, notes, reviewed coverage, transcript) is
// already persisted incrementally via ReviewSessionAutosave - submission
// only needs the reviewer's final call. Backend remains authoritative.
export function validateSubmission(state: ReviewState): SubmissionValidationResult {
  const result = SubmitSessionRequestSchema.safeParse({
    recommendation: state.recommendation,
    finalRationale: state.finalRationale.trim(),
  });

  if (result.success) {
    return { ok: true, submission: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}
