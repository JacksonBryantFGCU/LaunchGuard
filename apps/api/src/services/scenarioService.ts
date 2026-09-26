import type { PublicReviewScenario, ScenarioPreview } from "@redline/shared";
import { listScenarioPreviews, getPublicScenarioBySlug } from "@redline/scenarios";

export function listScenarios(): ScenarioPreview[] {
  return listScenarioPreviews();
}

export function getScenarioBySlug(slug: string): PublicReviewScenario | undefined {
  return getPublicScenarioBySlug(slug);
}
