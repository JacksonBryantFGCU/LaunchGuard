import { Router } from "express";
import { listScenarios, getScenarioBySlug } from "../services/scenarioService.js";

export const scenariosRouter = Router();

scenariosRouter.get("/", (_req, res) => {
  res.json(listScenarios());
});

scenariosRouter.get("/:slug", (req, res) => {
  const scenario = getScenarioBySlug(req.params.slug);
  if (!scenario) {
    res.status(404).json({ error: "scenario_not_found", message: "No scenario matches this slug." });
    return;
  }
  res.json(scenario);
});
