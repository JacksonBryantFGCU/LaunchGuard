import type { PracticeScenario } from "@redline/shared";
import { toPublicPracticeScenario } from "./internalPracticeScenario.js";
import { blackFridayPracticeScenarios } from "./black-friday-checkout/practiceScenarios.js";

const practiceScenariosById = new Map<string, PracticeScenario>(
  blackFridayPracticeScenarios.map((scenario) => [
    scenario.publicScenario.id,
    toPublicPracticeScenario(scenario),
  ]),
);

export function listPracticeScenarios(): PracticeScenario[] {
  return Array.from(practiceScenariosById.values()).sort((a, b) => a.order - b.order);
}

export function getPracticeScenarioById(id: string): PracticeScenario | undefined {
  return practiceScenariosById.get(id);
}
