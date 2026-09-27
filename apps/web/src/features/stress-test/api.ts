import { StressTestRevealListSchema } from "@purgatory/shared";
import { apiGet } from "../../lib/api/client.js";

export function getStressTests(reviewId: string) {
  return apiGet(
    `/api/reviews/${encodeURIComponent(reviewId)}/stress-tests`,
    (data) => StressTestRevealListSchema.parse(data),
    { authed: true },
  );
}
