import { Router } from "express";
import { getUserId } from "../middleware/auth.js";
import type { ReviewRepository } from "../services/reviewRepository.js";
import {
  startOrResumeSession,
  getSessionForOwner,
  updateDraft,
  addRedline,
  updateRedline,
  deleteRedline,
  addTranscriptTurn,
  saveStressProgress,
  submitSession,
  type ServiceResult,
} from "../services/reviewSessionService.js";

function respond(res: import("express").Response, result: ServiceResult<unknown>): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json(result.result);
}

export function createReviewSessionsRouter(repository: ReviewRepository): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    respond(res, await startOrResumeSession(repository, getUserId(req), req.body));
  });

  router.get("/:id", async (req, res) => {
    respond(res, await getSessionForOwner(repository, getUserId(req), req.params.id));
  });

  router.patch("/:id", async (req, res) => {
    respond(res, await updateDraft(repository, getUserId(req), req.params.id, req.body));
  });

  router.post("/:id/redlines", async (req, res) => {
    respond(res, await addRedline(repository, getUserId(req), req.params.id, req.body));
  });

  router.patch("/:id/redlines/:redlineId", async (req, res) => {
    respond(res, await updateRedline(repository, getUserId(req), req.params.id, req.params.redlineId, req.body));
  });

  router.delete("/:id/redlines/:redlineId", async (req, res) => {
    respond(res, await deleteRedline(repository, getUserId(req), req.params.id, req.params.redlineId));
  });

  router.post("/:id/transcript-turns", async (req, res) => {
    respond(res, await addTranscriptTurn(repository, getUserId(req), req.params.id, req.body));
  });

  router.post("/:id/stress-progress", async (req, res) => {
    respond(res, await saveStressProgress(repository, getUserId(req), req.params.id, req.body));
  });

  router.post("/:id/submit", async (req, res) => {
    respond(res, await submitSession(repository, getUserId(req), req.params.id, req.body));
  });

  return router;
}
