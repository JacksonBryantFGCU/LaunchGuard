import type { PublicReviewScenario, ScenarioPreview } from "@redline/shared";
import type { InternalReviewScenario } from "./internalDomain.js";
import { paymentRetryScenario } from "./payment-retry/scenario.js";
import { toPublicReviewScenario, toScenarioPreview } from "./projection.js";

const scenariosBySlug = new Map<string, InternalReviewScenario>([
  [paymentRetryScenario.slug, paymentRetryScenario],
]);

export function listScenarioPreviews(): ScenarioPreview[] {
  return Array.from(scenariosBySlug.values()).map(toScenarioPreview);
}

export function getPublicScenarioBySlug(slug: string): PublicReviewScenario | undefined {
  const scenario = scenariosBySlug.get(slug);
  return scenario ? toPublicReviewScenario(scenario) : undefined;
}

// Server-only: returns full scenario truth (developer persona, hidden issues/
// tests, rubric). Never re-export this beyond apps/api backend code - the
// frontend has no dependency on this package at all, which is what actually
// keeps this safe, not just naming.
export function getInternalScenarioBySlug(slug: string): InternalReviewScenario | undefined {
  return scenariosBySlug.get(slug);
}
