import { Router, type Response } from "express";
import { UpdateLeaderboardProfileRequestSchema } from "@redline/shared";
import { getUserId } from "../middleware/auth.js";
import type { LeaderboardRepository } from "../services/leaderboardRepository.js";
import {
  getOverallLeaderboard,
  getScenarioLeaderboard,
  getProfile,
  updateProfile,
  type ServiceResult,
} from "../services/leaderboardService.js";

function respond(res: Response, result: ServiceResult<unknown>): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json(result.result);
}

export function createLeaderboardRouter(leaderboardRepo: LeaderboardRepository): Router {
  const router = Router();

  router.get("/overall", async (req, res) => {
    respond(res, await getOverallLeaderboard(leaderboardRepo, getUserId(req)));
  });

  router.get("/scenarios/:scenarioId", async (req, res) => {
    const { scenarioId } = req.params as { scenarioId: string };
    respond(res, await getScenarioLeaderboard(leaderboardRepo, getUserId(req), scenarioId));
  });

  router.get("/profile", async (req, res) => {
    respond(res, await getProfile(leaderboardRepo, getUserId(req)));
  });

  router.patch("/profile", async (req, res) => {
    const parsed = UpdateLeaderboardProfileRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "The profile update is malformed." });
      return;
    }
    respond(res, await updateProfile(leaderboardRepo, getUserId(req), parsed.data));
  });

  return router;
}
