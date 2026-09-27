import { z } from "zod";
import {
  PracticeScenarioSchema,
  PracticeScenarioAttemptSummarySchema,
  PracticeScenarioAttemptViewSchema,
  PracticeScenarioStatusSchema,
  ScenarioEvaluationResultSchema,
  type PracticeScenario,
  type PracticeScenarioAttemptSummary,
  type PracticeScenarioAttemptView,
  type SavePracticeResponseDraftRequest,
  type AddPracticeEvidenceRequest,
  type ScenarioEvaluationResult,
  type PracticeScenarioStatus,
} from "@redline/shared";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "../../lib/api/client.js";

const parseView = (data: unknown) => PracticeScenarioAttemptViewSchema.parse(data);
const attemptsPath = (reviewSessionId: string, practiceScenarioId?: string) =>
  `/api/review-sessions/${encodeURIComponent(reviewSessionId)}/practice-scenarios${
    practiceScenarioId ? `/${encodeURIComponent(practiceScenarioId)}` : ""
  }`;

export function listPracticeScenarios(): Promise<PracticeScenario[]> {
  return apiGet("/api/practice-scenarios", (data) => z.array(PracticeScenarioSchema).parse(data));
}

export function getPracticeScenarioById(id: string): Promise<PracticeScenario> {
  return apiGet(`/api/practice-scenarios/${encodeURIComponent(id)}`, (data) => PracticeScenarioSchema.parse(data));
}

export function listPracticeScenarioAttemptSummaries(reviewSessionId: string): Promise<PracticeScenarioAttemptSummary[]> {
  return apiGet(attemptsPath(reviewSessionId), (data) => z.array(PracticeScenarioAttemptSummarySchema).parse(data), {
    authed: true,
  });
}

export function startPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<{ status: string }> {
  return apiPost(
    `${attemptsPath(reviewSessionId, practiceScenarioId)}/start`,
    undefined,
    (data) => z.object({ status: z.string() }).parse(data),
    { authed: true },
  );
}

export function getPracticeScenarioAttempt(
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<PracticeScenarioAttemptView> {
  return apiGet(attemptsPath(reviewSessionId, practiceScenarioId), parseView, { authed: true });
}

export function savePracticeResponseDraft(
  reviewSessionId: string,
  practiceScenarioId: string,
  patch: SavePracticeResponseDraftRequest,
): Promise<PracticeScenarioAttemptView> {
  return apiPatch(`${attemptsPath(reviewSessionId, practiceScenarioId)}/response`, patch, parseView, { authed: true });
}

export function setPracticeRequirements(
  reviewSessionId: string,
  practiceScenarioId: string,
  requirementIds: string[],
): Promise<PracticeScenarioAttemptView> {
  return apiPut(`${attemptsPath(reviewSessionId, practiceScenarioId)}/requirements`, { requirementIds }, parseView, {
    authed: true,
  });
}

export function addPracticeEvidence(
  reviewSessionId: string,
  practiceScenarioId: string,
  input: AddPracticeEvidenceRequest,
): Promise<PracticeScenarioAttemptView> {
  return apiPost(`${attemptsPath(reviewSessionId, practiceScenarioId)}/evidence`, input, parseView, { authed: true });
}

export function removePracticeEvidence(
  reviewSessionId: string,
  practiceScenarioId: string,
  evidenceId: string,
): Promise<PracticeScenarioAttemptView> {
  return apiDelete(`${attemptsPath(reviewSessionId, practiceScenarioId)}/evidence/${encodeURIComponent(evidenceId)}`, parseView, {
    authed: true,
  });
}

export function setPracticeResponseEvidence(
  reviewSessionId: string,
  practiceScenarioId: string,
  evidenceIds: string[],
): Promise<PracticeScenarioAttemptView> {
  return apiPut(`${attemptsPath(reviewSessionId, practiceScenarioId)}/response-evidence`, { evidenceIds }, parseView, {
    authed: true,
  });
}

const SubmitPracticeScenarioResultSchema = z.object({
  attempt: z.object({ status: PracticeScenarioStatusSchema }),
  evaluation: ScenarioEvaluationResultSchema,
});

export function submitPracticeScenarioResponse(
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<{ attempt: { status: PracticeScenarioStatus }; evaluation: ScenarioEvaluationResult }> {
  return apiPost(
    `${attemptsPath(reviewSessionId, practiceScenarioId)}/submit`,
    undefined,
    (data) => SubmitPracticeScenarioResultSchema.parse(data),
    { authed: true },
  );
}

export function markPracticeScenarioConsequenceReady(
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<PracticeScenarioAttemptView> {
  return apiPost(`${attemptsPath(reviewSessionId, practiceScenarioId)}/consequence-ready`, undefined, parseView, {
    authed: true,
  });
}

export function completePracticeScenarioAttempt(
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<PracticeScenarioAttemptView> {
  return apiPost(`${attemptsPath(reviewSessionId, practiceScenarioId)}/complete`, undefined, parseView, { authed: true });
}
