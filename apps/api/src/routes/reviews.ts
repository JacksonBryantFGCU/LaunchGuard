import { Router } from "express";
import { getUserId } from "../middleware/auth.js";
import type { ReviewRepository } from "../services/reviewRepository.js";
import type { PracticeScenarioRepository } from "../services/practiceScenarioRepository.js";
import { getStressTestsForReview } from "../services/stressTestService.js";
import { listHistory } from "../services/reviewSessionService.js";

export function createReviewsRouter(repository: ReviewRepository, practiceRepository: PracticeScenarioRepository): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const result = await listHistory(repository, getUserId(req));
    if (!result.ok) {
      res.status(result.status).json({ error: result.error, message: result.message });
      return;
    }
    res.json(result.result);
  });

  router.get("/:reviewId/stress-tests", async (req, res) => {
    const result = await getStressTestsForReview(repository, practiceRepository, req.params.reviewId, getUserId(req));
    if (!result.ok) {
      res.status(result.status).json({ error: result.error, message: result.message });
      return;
    }
    res.json(result.result);
  });

  return router;
}
