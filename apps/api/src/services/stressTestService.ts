import { StressTestRevealListSchema, type StressTestRevealList } from "@redline/shared";
import { getInternalScenarioBySlug, toPublicStressTests } from "@redline/scenarios/internal";
import type { ReviewRepository } from "./reviewRepository.js";

export type GetStressTestsFailure = { ok: false; status: number; error: string; message: string };
export type GetStressTestsSuccess = { ok: true; result: StressTestRevealList };

// Stress tests can only be requested for a session that has actually
// submitted - the scenario slug always comes from the stored session, never
// from a client-supplied value, so an arbitrary/unsubmitted scenario can't
// be probed. Also enforced: only the verified owner may fetch its stress
// tests, so one authenticated user can't read another's results by
// guessing a review id.
export async function getStressTestsForReview(
  repo: ReviewRepository,
  reviewId: string,
  requestingUserId: string,
): Promise<GetStressTestsSuccess | GetStressTestsFailure> {
  const session = await repo.getSession(reviewId);
  if (!session) {
    return { ok: false, status: 404, error: "review_not_found", message: "No submitted review matches this id." };
  }
  if (session.userId !== requestingUserId) {
    return { ok: false, status: 403, error: "forbidden", message: "This review belongs to a different user." };
  }
  if (session.status !== "submitted") {
    return { ok: false, status: 404, error: "review_not_found", message: "No submitted review matches this id." };
  }

  const scenario = getInternalScenarioBySlug(session.scenarioSlug);
  if (!scenario) {
    return { ok: false, status: 404, error: "scenario_not_found", message: "No scenario matches this review." };
  }

  const result = StressTestRevealListSchema.parse({
    reviewId: session.id,
    scenarioSlug: session.scenarioSlug,
    tests: toPublicStressTests(scenario),
  });

  return { ok: true, result };
}
