import type { ArchitectureModification, InterventionDefinition, StressParameterValues, StressProfile, StressTestTimelineResult } from "@redline/shared";
import type { InternalArchitectureScenario } from "./internalScenario.js";
import { blackFridayCheckoutInternalScenario } from "./black-friday-checkout/internal.js";
import { getInternalPracticeScenarioById } from "./internalPracticeScenarioRegistry.js";
import { runStressTimeline } from "./stressLab/timeline.js";
import { blackFridayInterventions, blackFridayTestDefinitions, buildBlackFridayTimelineInput } from "./stressLab/blackFridayStressLab.js";

export type { InternalArchitectureScenario } from "./internalScenario.js";
export { toPublicStressTests } from "./internalScenario.js";
export type { InternalPracticeScenario } from "./internalPracticeScenario.js";
export { getInternalPracticeScenarioById } from "./internalPracticeScenarioRegistry.js";
export { evaluateScenarioResponse } from "./scenarioEvaluator.js";
export { isValidPlacement } from "./stressLab/compatibility.js";

// Interactive Architecture Stress Lab (spec: Live Stress Simulation Engine).
// All five Black Friday Checkout practice scenarios share this one
// architecture/test-definition pool; which subset of tests a given
// scenario offers comes from its authored InternalPracticeScenario.stressLabTestIds
// (packages/scenarios/src/black-friday-checkout/practiceScenarios.ts) -
// never a hardcoded per-scenario map here, and never every test for every
// scenario.

/**
 * Public-facing test-definition/palette lookup - safe to forward to the
 * frontend as-is.
 *
 * Returns undefined only when practiceScenarioId doesn't match any
 * registered practice scenario at all. A scenario that exists but has no
 * linked Stress Lab tests (stressLabTestIds: []) returns a defined result
 * with an empty testDefinitions array - the caller/frontend must treat
 * that as "intentionally unsupported", not as a 404/error (spec #10).
 */
export function getStressLabDefinition(practiceScenarioId: string): { testDefinitions: StressProfile[]; interventions: InterventionDefinition[] } | undefined {
  const scenario = getInternalPracticeScenarioById(practiceScenarioId);
  if (!scenario) return undefined;

  const testDefinitions = blackFridayTestDefinitions.filter((t) => scenario.stressLabTestIds.includes(t.id));

  // Dev-time diagnostic (spec #11): a configured id that resolved to
  // nothing is very likely a typo, distinct from an intentionally empty
  // stressLabTestIds. The registry-consistency test already prevents this
  // from ever shipping; this is a belt-and-suspenders runtime signal.
  if (scenario.stressLabTestIds.length > 0 && testDefinitions.length === 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[stress-lab] No registered stress tests resolved for practice scenario: ${practiceScenarioId}\n` +
        `Configured IDs: ${scenario.stressLabTestIds.join(", ")}\n` +
        `Registered IDs: ${blackFridayTestDefinitions.map((t) => t.id).join(", ")}`,
    );
  }

  return { testDefinitions, interventions: blackFridayInterventions };
}

/**
 * Runs the deterministic timeline simulation for one of a practice
 * scenario's stress tests. The only seam that touches private
 * capacity/formula data - callers only ever get back the projected
 * StressTestTimelineResult.
 *
 * Refuses to run a testId not linked to this scenario (even if it's a
 * valid test for a different scenario) - the API must only ever resolve
 * authored tests, never every test for every scenario (spec #6).
 */
export function runStressLabSimulation(
  practiceScenarioId: string,
  testId: string,
  parameters: StressParameterValues,
  modifications: ArchitectureModification[],
): StressTestTimelineResult | undefined {
  const scenario = getInternalPracticeScenarioById(practiceScenarioId);
  if (!scenario || !scenario.stressLabTestIds.includes(testId)) return undefined;

  const input = buildBlackFridayTimelineInput(testId, parameters, modifications);
  if (!input) return undefined;
  return runStressTimeline(input);
}

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
