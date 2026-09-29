import type { SystemSummary } from "@purgatory/shared";
import { blackFridayCheckoutScenario } from "./black-friday-checkout/scenario.js";
import { blackFridayTestDefinitions } from "./stressLab/blackFridayStressLab.js";

// Sample systems are code-authored, not database rows (see the existing
// registry.ts pattern for architecture scenarios) - there is no sensible
// "owner" for shipped sample content, and forcing it into a user-owned
// table would create awkward ownership rules for nothing.
const sampleSystemsBySlug = new Map<string, SystemSummary>([
  [
    blackFridayCheckoutScenario.slug,
    {
      id: blackFridayCheckoutScenario.slug,
      slug: blackFridayCheckoutScenario.slug,
      name: blackFridayCheckoutScenario.title,
      description: blackFridayCheckoutScenario.description,
      sourceType: "sample",
      visibility: "public",
      ownerUserId: null,
      componentCount: blackFridayCheckoutScenario.nodes.length,
      scenarioCount: blackFridayTestDefinitions.length,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
]);

export function listSampleSystems(): SystemSummary[] {
  return Array.from(sampleSystemsBySlug.values());
}

export function getSampleSystemBySlug(slug: string): SystemSummary | undefined {
  return sampleSystemsBySlug.get(slug);
}
