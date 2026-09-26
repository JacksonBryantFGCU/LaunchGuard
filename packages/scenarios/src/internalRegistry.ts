import type { InternalArchitectureScenario } from "./internalScenario.js";
import { blackFridayCheckoutInternalScenario } from "./black-friday-checkout/internal.js";

export type { InternalArchitectureScenario } from "./internalScenario.js";
export { toPublicStressTests } from "./internalScenario.js";

const internalScenariosBySlug = new Map<string, InternalArchitectureScenario>([
  [blackFridayCheckoutInternalScenario.slug, blackFridayCheckoutInternalScenario],
]);

/**
 * Private scenario truth (architect context, hidden risks, stress tests,
 * evaluation rubric). Deliberately not exported from this package's main
 * entry point - import from "@redline/scenarios/internal" only where
 * private access is genuinely required (e.g. building architect
 * conversation context for voice). Never forward the return value to the
 * frontend; project it first.
 */
export function getInternalScenarioBySlug(slug: string): InternalArchitectureScenario | undefined {
  return internalScenariosBySlug.get(slug);
}
