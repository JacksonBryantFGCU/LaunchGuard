import type { InternalPracticeScenario } from "./internalPracticeScenario.js";
import { blackFridayPracticeScenarios } from "./black-friday-checkout/practiceScenarios.js";

export type { InternalPracticeScenario } from "./internalPracticeScenario.js";

const internalPracticeScenariosById = new Map<string, InternalPracticeScenario>(
  blackFridayPracticeScenarios.map((scenario) => [scenario.publicScenario.id, scenario]),
);

/**
 * Private practice-scenario truth. Never forward the return value to the
 * frontend or to the pre-submission API response - project it with
 * toPublicPracticeScenario() or evaluateScenarioResponse() first.
 */
export function getInternalPracticeScenarioById(id: string): InternalPracticeScenario | undefined {
  return internalPracticeScenariosById.get(id);
}
