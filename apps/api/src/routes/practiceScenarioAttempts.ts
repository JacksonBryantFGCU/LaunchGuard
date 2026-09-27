import { Router, type Response } from "express";
import {
  SavePracticeResponseDraftRequestSchema,
  SetPracticeRequirementsRequestSchema,
  AddPracticeEvidenceRequestSchema,
  SetResponseEvidenceRequestSchema,
  ArchitectureModificationSchema,
  StressParameterValuesSchema,
} from "@redline/shared";
import { z } from "zod";
import { getUserId } from "../middleware/auth.js";
import type { ReviewRepository } from "../services/reviewRepository.js";
import type { PracticeScenarioRepository } from "../services/practiceScenarioRepository.js";
import type { LeaderboardRepository } from "../services/leaderboardRepository.js";
import {
  getOrStartPracticeScenarioAttempt,
  getPracticeScenarioAttemptView,
  listPracticeScenarioAttemptSummaries,
  savePracticeResponseDraft,
  setPracticeRequirements,
  addPracticeEvidence,
  removePracticeEvidence,
  setPracticeResponseEvidence,
  submitPracticeScenarioResponse,
  markPracticeScenarioConsequenceReady,
  completePracticeScenarioAttempt,
  type ServiceResult,
} from "../services/practiceScenarioService.js";
import {
  getStressTestDefinitions,
  runStressSimulation,
  listStressSimulationRuns,
  type StressServiceResult,
} from "../services/stressSimulationService.js";

function respond(res: Response, result: ServiceResult<unknown>): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json(result.result);
}

function respondStress(res: Response, result: StressServiceResult<unknown>): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json(result.result);
}

const badRequest = (res: Response, error: string, message: string) => res.status(400).json({ error, message });

// Mounted at /api/review-sessions/:reviewSessionId/practice-scenarios (mergeParams
// so :reviewSessionId from the parent path is available here).
export function createPracticeScenarioAttemptsRouter(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  leaderboardRepo: LeaderboardRepository,
): Router {
  const router = Router({ mergeParams: true });

  router.get("/", async (req, res) => {
    const { reviewSessionId } = req.params as { reviewSessionId: string };
    respond(res, await listPracticeScenarioAttemptSummaries(reviewRepo, practiceRepo, getUserId(req), reviewSessionId));
  });

  router.post("/:scenarioId/start", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respond(res, await getOrStartPracticeScenarioAttempt(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  router.get("/:scenarioId", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respond(res, await getPracticeScenarioAttemptView(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  router.patch("/:scenarioId/response", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    const parsed = SavePracticeResponseDraftRequestSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "invalid_request", "The response draft is malformed.");
    respond(res, await savePracticeResponseDraft(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId, parsed.data));
  });

  router.put("/:scenarioId/requirements", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    const parsed = SetPracticeRequirementsRequestSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "invalid_request", "The requirement selection is malformed.");
    respond(
      res,
      await setPracticeRequirements(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId, parsed.data.requirementIds),
    );
  });

  router.post("/:scenarioId/evidence", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    const parsed = AddPracticeEvidenceRequestSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "invalid_request", "The evidence is malformed.");
    respond(res, await addPracticeEvidence(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId, parsed.data));
  });

  router.delete("/:scenarioId/evidence/:evidenceId", async (req, res) => {
    const { reviewSessionId, scenarioId, evidenceId } = req.params as {
      reviewSessionId: string;
      scenarioId: string;
      evidenceId: string;
    };
    respond(res, await removePracticeEvidence(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId, evidenceId));
  });

  router.put("/:scenarioId/response-evidence", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    const parsed = SetResponseEvidenceRequestSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "invalid_request", "The evidence selection is malformed.");
    respond(
      res,
      await setPracticeResponseEvidence(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId, parsed.data.evidenceIds),
    );
  });

  router.post("/:scenarioId/submit", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respond(res, await submitPracticeScenarioResponse(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  router.post("/:scenarioId/consequence-ready", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respond(res, await markPracticeScenarioConsequenceReady(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  router.post("/:scenarioId/complete", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respond(
      res,
      await completePracticeScenarioAttempt(reviewRepo, practiceRepo, leaderboardRepo, getUserId(req), reviewSessionId, scenarioId),
    );
  });

  router.get("/:scenarioId/stress-tests", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respondStress(res, await getStressTestDefinitions(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  const RunStressSimulationBodySchema = z.object({
    testId: z.string().min(1),
    parameters: StressParameterValuesSchema.default({}),
    modifications: z.array(ArchitectureModificationSchema).default([]),
  });

  router.post("/:scenarioId/stress-runs", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    const parsed = RunStressSimulationBodySchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "invalid_request", "The test id, parameters, or modifications are malformed.");
    respondStress(
      res,
      await runStressSimulation(
        reviewRepo,
        practiceRepo,
        getUserId(req),
        reviewSessionId,
        scenarioId,
        parsed.data.testId,
        parsed.data.parameters,
        parsed.data.modifications,
      ),
    );
  });

  router.get("/:scenarioId/stress-runs", async (req, res) => {
    const { reviewSessionId, scenarioId } = req.params as { reviewSessionId: string; scenarioId: string };
    respondStress(res, await listStressSimulationRuns(reviewRepo, practiceRepo, getUserId(req), reviewSessionId, scenarioId));
  });

  return router;
}
