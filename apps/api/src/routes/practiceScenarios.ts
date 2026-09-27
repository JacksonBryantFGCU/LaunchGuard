import { Router } from "express";
import { listPracticeScenarios, getPracticeScenarioById } from "@redline/scenarios";

// Public - practice scenario content (situation, objective, prompts) carries
// no scoring truth, same trust level as /api/scenarios.
export const practiceScenariosRouter = Router();

practiceScenariosRouter.get("/", (_req, res) => {
  res.json(listPracticeScenarios());
});

practiceScenariosRouter.get("/:id", (req, res) => {
  const scenario = getPracticeScenarioById(req.params.id);
  if (!scenario) {
    res.status(404).json({ error: "practice_scenario_not_found", message: "No practice scenario matches this id." });
    return;
  }
  res.json(scenario);
});
