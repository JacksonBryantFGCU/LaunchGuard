import type { ArchitectureScenarioPreview, PublicArchitectureScenario } from "@purgatory/shared";
import { listScenarioPreviews, getPublicScenarioBySlug } from "@purgatory/scenarios";

export function listScenarios(): ArchitectureScenarioPreview[] {
  return listScenarioPreviews();
}

export function getScenarioBySlug(slug: string): PublicArchitectureScenario | undefined {
  return getPublicScenarioBySlug(slug);
}
