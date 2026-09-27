import {
  ScenarioResponseSchema,
  type ScenarioEvaluationResult,
  type PracticeScenarioAttemptView,
  type PracticeScenarioAttemptSummary,
  type SavePracticeResponseDraftRequest,
  type AddPracticeEvidenceRequest,
} from "@redline/shared";
import { getPracticeScenarioById } from "@redline/scenarios";
import {
  getInternalPracticeScenarioById,
  evaluateScenarioResponse,
  evaluateResilience,
  combineScenarioEvaluation,
  getStressLabDefinition,
} from "@redline/scenarios/internal";
import type { ReviewRepository } from "./reviewRepository.js";
import { requireOwnedSession } from "./reviewSessionService.js";
import {
  AttemptLockedError,
  type PracticeScenarioAttemptRecord,
  type PracticeScenarioRepository,
} from "./practiceScenarioRepository.js";
import type { LeaderboardRepository } from "./leaderboardRepository.js";
import { recordScenarioCompletion } from "./leaderboardService.js";

export type ServiceFailure = { ok: false; status: number; error: string; message: string };
export type ServiceResult<T> = { ok: true; result: T } | ServiceFailure;

const notFound = (message: string): ServiceFailure => ({ ok: false, status: 404, error: "not_found", message });
const badRequest = (error: string, message: string): ServiceFailure => ({ ok: false, status: 400, error, message });
const locked: ServiceFailure = {
  ok: false,
  status: 409,
  error: "attempt_locked",
  message: "This practice scenario has already been submitted and can no longer be modified.",
};

/** Runs a locking-sensitive repository mutation, mapping AttemptLockedError to a 409. */
async function runLockAware<T>(mutate: () => Promise<T>): Promise<{ ok: true; value: T } | ServiceFailure> {
  try {
    return { ok: true, value: await mutate() };
  } catch (err) {
    if (err instanceof AttemptLockedError) return locked;
    throw err;
  }
}

/**
 * Verifies review-session ownership (via the existing ReviewRepository),
 * then returns or creates the practice attempt under that session. This is
 * the whole ownership boundary for practice scenarios - the practice
 * repository itself never sees a userId, exactly like ReviewRepository.
 */
export async function getOrStartPracticeScenarioAttempt(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<PracticeScenarioAttemptRecord>> {
  const owned = await requireOwnedSession(reviewRepo, userId, reviewSessionId);
  if (!owned.ok) return owned;

  if (!getPracticeScenarioById(practiceScenarioId)) {
    return notFound(`No practice scenario matches id: ${practiceScenarioId}`);
  }

  const attempt = await practiceRepo.createPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
  return { ok: true, result: attempt };
}

export interface SubmitPracticeScenarioResult {
  attempt: PracticeScenarioAttemptRecord;
  evaluation: ScenarioEvaluationResult;
}

/**
 * Validates response completeness (a schema failure here means "reject",
 * not "silently accept"), submits, evaluates against the private scenario
 * truth (packages/scenarios/scenarioEvaluator.ts - never duplicated here),
 * and persists the safe result projection.
 */
export async function submitPracticeScenarioResponse(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<SubmitPracticeScenarioResult>> {
  const owned = await requireOwnedSession(reviewRepo, userId, reviewSessionId);
  if (!owned.ok) return owned;

  const internalScenario = getInternalPracticeScenarioById(practiceScenarioId);
  if (!internalScenario) return notFound(`No practice scenario matches id: ${practiceScenarioId}`);

  const attempt = await practiceRepo.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
  if (!attempt) return notFound("This practice scenario has not been started yet.");

  const [draft, affectedRequirementIds, evidenceIds] = await Promise.all([
    practiceRepo.getPracticeScenarioResponse(attempt.id),
    practiceRepo.getPracticeScenarioRequirements(attempt.id),
    practiceRepo.getResponseEvidenceIds(attempt.id),
  ]);

  const parsed = ScenarioResponseSchema.safeParse({
    diagnosis: draft.diagnosis,
    investigationPlan: draft.investigationPlan,
    immediateAction: draft.immediateAction,
    architectureDecision: draft.architectureDecision,
    tradeoff: draft.tradeoff,
    severity: draft.severity,
    confidence: draft.confidence ?? undefined,
    affectedRequirementIds,
    evidenceIds,
  });
  if (!parsed.success) {
    return badRequest(
      "incomplete_response",
      "Diagnosis, investigation plan, immediate action, architecture decision, tradeoff, and severity are all required before submitting.",
    );
  }

  const submitted = await practiceRepo.submitPracticeScenarioResponse(attempt.id);
  const written = evaluateScenarioResponse(parsed.data, internalScenario);

  // Resilience is scored from whatever Stress Lab runs already exist for
  // this attempt at submit time - the learner is expected to have run (and
  // ideally passed) the scenario's tests during investigation, not after.
  const stressLab = getStressLabDefinition(practiceScenarioId);
  const runs = await practiceRepo.listStressSimulationRuns(attempt.id);
  const resilience = evaluateResilience(stressLab?.testDefinitions ?? [], runs);
  const evaluation = combineScenarioEvaluation(written, resilience);

  await practiceRepo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: evaluation.objectiveScore,
    objectiveMaxScore: evaluation.maxObjectiveScore,
    resultData: evaluation,
  });

  const refreshed = await practiceRepo.getPracticeScenarioAttemptById(attempt.id);
  return { ok: true, result: { attempt: refreshed ?? submitted, evaluation } };
}

async function requireAttempt(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<{ ok: true; attempt: PracticeScenarioAttemptRecord } | ServiceFailure> {
  const owned = await requireOwnedSession(reviewRepo, userId, reviewSessionId);
  if (!owned.ok) return owned;

  const attempt = await practiceRepo.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
  if (!attempt) return notFound("This practice scenario has not been started yet.");
  return { ok: true, attempt };
}

async function toAttemptView(
  practiceRepo: PracticeScenarioRepository,
  attempt: PracticeScenarioAttemptRecord,
): Promise<PracticeScenarioAttemptView> {
  const [response, affectedRequirementIds, evidence, selectedEvidenceIds, result] = await Promise.all([
    practiceRepo.getPracticeScenarioResponse(attempt.id),
    practiceRepo.getPracticeScenarioRequirements(attempt.id),
    practiceRepo.listPracticeScenarioEvidence(attempt.id),
    practiceRepo.getResponseEvidenceIds(attempt.id),
    practiceRepo.getPracticeScenarioResult(attempt.id),
  ]);

  return {
    attemptId: attempt.id,
    reviewSessionId: attempt.reviewSessionId,
    practiceScenarioId: attempt.practiceScenarioId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    completedAt: attempt.completedAt,
    response,
    affectedRequirementIds,
    evidence: evidence.map((e) => ({
      id: e.id,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      label: e.label,
      content: e.content,
      transcriptTurnId: e.transcriptTurnId,
      createdAt: e.createdAt,
    })),
    selectedEvidenceIds,
    result: result?.resultData ?? null,
  };
}

export async function getPracticeScenarioAttemptView(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function listPracticeScenarioAttemptSummaries(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
): Promise<ServiceResult<PracticeScenarioAttemptSummary[]>> {
  const owned = await requireOwnedSession(reviewRepo, userId, reviewSessionId);
  if (!owned.ok) return owned;

  const attempts = await practiceRepo.listPracticeScenarioAttempts(reviewSessionId);
  const summaries = await Promise.all(
    attempts.map(async (attempt) => {
      const result = await practiceRepo.getPracticeScenarioResult(attempt.id);
      return {
        practiceScenarioId: attempt.practiceScenarioId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        completedAt: attempt.completedAt,
        objectiveScore: result?.objectiveScore ?? null,
        maxObjectiveScore: result?.objectiveMaxScore ?? null,
      };
    }),
  );
  return { ok: true, result: summaries };
}

export async function savePracticeResponseDraft(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  patch: SavePracticeResponseDraftRequest,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  const mutated = await runLockAware(() => practiceRepo.savePracticeScenarioResponseDraft(owned.attempt.id, patch));
  if (!mutated.ok) return mutated;
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function setPracticeRequirements(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  requirementIds: string[],
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  const mutated = await runLockAware(() => practiceRepo.setPracticeScenarioRequirements(owned.attempt.id, requirementIds));
  if (!mutated.ok) return mutated;
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function addPracticeEvidence(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  input: AddPracticeEvidenceRequest,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;

  if (input.transcriptTurnId) {
    const turns = await reviewRepo.listTranscriptTurns(reviewSessionId);
    if (!turns.some((t) => t.id === input.transcriptTurnId)) {
      return badRequest("invalid_transcript_reference", "That transcript turn does not belong to this review session.");
    }
  }

  const mutated = await runLockAware(() =>
    practiceRepo.addPracticeScenarioEvidence(owned.attempt.id, {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      label: input.label,
      content: input.content,
      transcriptTurnId: input.transcriptTurnId ?? null,
    }),
  );
  if (!mutated.ok) return mutated;
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function removePracticeEvidence(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  evidenceId: string,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  const mutated = await runLockAware(() => practiceRepo.removePracticeScenarioEvidence(owned.attempt.id, evidenceId));
  if (!mutated.ok) return mutated;
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function setPracticeResponseEvidence(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  evidenceIds: string[],
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  try {
    const mutated = await runLockAware(() => practiceRepo.setResponseEvidence(owned.attempt.id, evidenceIds));
    if (!mutated.ok) return mutated;
  } catch {
    return badRequest("invalid_evidence_reference", "One or more evidence ids do not belong to this practice scenario.");
  }
  return { ok: true, result: await toAttemptView(practiceRepo, owned.attempt) };
}

export async function markPracticeScenarioConsequenceReady(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  await practiceRepo.markScenarioConsequenceReady(owned.attempt.id);
  const refreshed = await practiceRepo.getPracticeScenarioAttemptById(owned.attempt.id);
  return { ok: true, result: await toAttemptView(practiceRepo, refreshed ?? owned.attempt) };
}

export async function completePracticeScenarioAttempt(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  leaderboardRepo: LeaderboardRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<PracticeScenarioAttemptView>> {
  const owned = await requireAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!owned.ok) return owned;
  await practiceRepo.completePracticeScenario(owned.attempt.id);

  // Best-effort: an attempt can reach completed without a result in
  // principle (shouldn't normally happen), so this just skips recording
  // rather than failing the completion.
  //
  // The leaderboard ranks on totalScore (written response + resilience),
  // not the written response alone - result.objectiveScore/objectiveMaxScore
  // (the stored columns) stay written-response-only for that page's own
  // breakdown; result.resultData carries the combined totals.
  const result = await practiceRepo.getPracticeScenarioResult(owned.attempt.id);
  if (result) {
    await recordScenarioCompletion(
      leaderboardRepo,
      userId,
      practiceScenarioId,
      owned.attempt.id,
      result.resultData.totalScore,
      result.resultData.maxTotalScore,
    );
  }

  const refreshed = await practiceRepo.getPracticeScenarioAttemptById(owned.attempt.id);
  return { ok: true, result: await toAttemptView(practiceRepo, refreshed ?? owned.attempt) };
}
