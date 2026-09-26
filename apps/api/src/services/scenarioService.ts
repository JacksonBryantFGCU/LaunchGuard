import type { ArchitectureScenarioPreview, PublicArchitectureScenario } from "@redline/shared";
import { listScenarioPreviews, getPublicScenarioBySlug } from "@redline/scenarios";

export function listScenarios(): ArchitectureScenarioPreview[] {
  return listScenarioPreviews();
}

export function getScenarioBySlug(slug: string): PublicArchitectureScenario | undefined {
  return getPublicScenarioBySlug(slug);
}
