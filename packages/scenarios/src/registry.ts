import type { ArchitectureScenarioPreview, PublicArchitectureScenario } from "@redline/shared";
import { blackFridayCheckoutScenario } from "./black-friday-checkout/scenario.js";

const scenariosBySlug = new Map<string, PublicArchitectureScenario>([
  [blackFridayCheckoutScenario.slug, blackFridayCheckoutScenario],
]);

function toScenarioPreview(scenario: PublicArchitectureScenario): ArchitectureScenarioPreview {
  return {
    id: scenario.id,
    slug: scenario.slug,
    title: scenario.title,
    reviewCode: scenario.reviewCode,
    description: scenario.description,
    difficulty: scenario.difficulty,
    focusAreas: scenario.focusAreas,
    nodeCount: scenario.nodes.length,
    edgeCount: scenario.edges.length,
  };
}

export function listScenarioPreviews(): ArchitectureScenarioPreview[] {
  return Array.from(scenariosBySlug.values()).map(toScenarioPreview);
}

export function getPublicScenarioBySlug(slug: string): PublicArchitectureScenario | undefined {
  return scenariosBySlug.get(slug);
}
