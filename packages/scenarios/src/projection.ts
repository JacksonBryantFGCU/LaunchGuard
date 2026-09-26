import { PublicReviewScenarioSchema, ScenarioPreviewSchema, type PublicReviewScenario, type ScenarioPreview } from "@redline/shared";
import type { InternalReviewScenario } from "./internalDomain.js";

// Projects server-only scenario truth down to the reviewer-visible shape.
// Parsing against the public schema strips developerPersona/hiddenIssues/
// hiddenTests/evaluationRubric even if a caller passes the full internal
// object, so the boundary doesn't depend solely on TypeScript typing.
export function toPublicReviewScenario(scenario: InternalReviewScenario): PublicReviewScenario {
  return PublicReviewScenarioSchema.parse(scenario);
}

export function toScenarioPreview(scenario: InternalReviewScenario): ScenarioPreview {
  return ScenarioPreviewSchema.parse({
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    categories: scenario.categories,
    prNumber: scenario.pullRequest.number,
    ciStatus: scenario.pullRequest.ciStatus,
    filesChanged: scenario.files.length,
    additions: scenario.pullRequest.additions,
    deletions: scenario.pullRequest.deletions,
  });
}
