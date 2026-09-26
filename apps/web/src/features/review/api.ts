import { ReviewSubmissionResultSchema, type ReviewSubmission } from "@redline/shared";
import { apiPost } from "../../lib/api/client.js";

export function submitReview(payload: ReviewSubmission) {
  return apiPost("/api/reviews", payload, (data) => ReviewSubmissionResultSchema.parse(data));
}
