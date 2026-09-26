import type { ArchitectConversationTurn, Redline, ReviewHistoryItem, ReviewSession } from "@redline/shared";
import {
  StartReviewSessionRequestSchema,
  UpdateDraftRequestSchema,
  RedlineSchema,
  RedlineDraftPatchSchema,
  TranscriptTurnRequestSchema,
  StressProgressRequestSchema,
  SubmitSessionRequestSchema,
} from "@redline/shared";
import { getPublicScenarioBySlug } from "@redline/scenarios";
import { getInternalScenarioBySlug } from "@redline/scenarios/internal";
import {
  SessionLockedError,
  type ReviewRepository,
  type ReviewSessionRecord,
} from "./reviewRepository.js";

export type ServiceFailure = { ok: false; status: number; error: string; message: string };
export type ServiceResult<T> = { ok: true; result: T } | ServiceFailure;

const notFound = (message = "No review session matches this id."): ServiceFailure => ({
  ok: false,
  status: 404,
  error: "session_not_found",
  message,
});
const forbidden: ServiceFailure = {
  ok: false,
  status: 403,
  error: "forbidden",
  message: "This review session belongs to a different user.",
};
const locked: ServiceFailure = {
  ok: false,
  status: 409,
  error: "session_locked",
  message: "This review has already been submitted and can no longer be modified.",
};
const badRequest = (error: string, message: string): ServiceFailure => ({ ok: false, status: 400, error, message });

async function requireOwnedSession(
  repo: ReviewRepository,
  userId: string,
  sessionId: string,
): Promise<{ ok: true; session: ReviewSessionRecord } | ServiceFailure> {
  const session = await repo.getSession(sessionId);
  if (!session) return notFound();
  if (session.userId !== userId) return forbidden;
  return { ok: true, session };
}

async function toView(repo: ReviewRepository, session: ReviewSessionRecord): Promise<ReviewSession> {
  const [redlines, transcript, submission, stressProgress] = await Promise.all([
    repo.listRedlines(session.id),
    repo.listTranscriptTurns(session.id),
    repo.getSubmission(session.id),
    repo.listStressProgress(session.id),
  ]);
  return {
    id: session.id,
    scenarioSlug: session.scenarioSlug,
    status: session.status,
    reviewedNodeIds: session.reviewedNodeIds,
    reviewedEdgeIds: session.reviewedEdgeIds,
    reviewerNotes: session.reviewerNotes,
    redlines,
    transcript,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    recommendation: submission?.recommendation ?? null,
    finalRationale: submission?.finalRationale ?? null,
    stressProgress,
  };
}

async function runMutation(
  repo: ReviewRepository,
  userId: string,
  sessionId: string,
  mutate: (session: ReviewSessionRecord) => Promise<void>,
): Promise<ServiceResult<ReviewSession>> {
  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;
  try {
    await mutate(owned.session);
  } catch (err) {
    if (err instanceof SessionLockedError) return locked;
    throw err;
  }
  const refreshed = await repo.getSession(sessionId);
  return { ok: true, result: await toView(repo, refreshed ?? owned.session) };
}

export async function startOrResumeSession(repo: ReviewRepository, userId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = StartReviewSessionRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_request", "A scenario slug is required.");

  const scenario = getPublicScenarioBySlug(parsed.data.scenarioSlug);
  if (!scenario) return notFound("No scenario matches this slug.");

  const existing = await repo.findActiveDraftSession(userId, parsed.data.scenarioSlug);
  const session = existing ?? (await repo.createSession(userId, parsed.data.scenarioSlug));
  return { ok: true, result: await toView(repo, session) };
}

export async function getSessionForOwner(repo: ReviewRepository, userId: string, sessionId: string): Promise<ServiceResult<ReviewSession>> {
  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;
  return { ok: true, result: await toView(repo, owned.session) };
}

export async function listHistory(repo: ReviewRepository, userId: string): Promise<ServiceResult<ReviewHistoryItem[]>> {
  const sessions = await repo.listUserSessions(userId);
  const items = await Promise.all(
    sessions.map(async (session) => {
      const [redlines, stressProgress] = await Promise.all([repo.listRedlines(session.id), repo.listStressProgress(session.id)]);
      return {
        reviewId: session.id,
        scenarioSlug: session.scenarioSlug,
        status: session.status,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt,
        redlineCount: redlines.length,
        stressProgress,
      };
    }),
  );
  return { ok: true, result: items };
}

function validateNodeEdgeIds(scenario: { nodes: { id: string }[]; edges: { id: string }[] }, nodeIds?: string[], edgeIds?: string[]): ServiceFailure | null {
  const nodeIdSet = new Set(scenario.nodes.map((n) => n.id));
  const edgeIdSet = new Set(scenario.edges.map((e) => e.id));
  for (const id of nodeIds ?? []) {
    if (!nodeIdSet.has(id)) return badRequest("invalid_node_reference", `Unknown node id: ${id}`);
  }
  for (const id of edgeIds ?? []) {
    if (!edgeIdSet.has(id)) return badRequest("invalid_edge_reference", `Unknown edge id: ${id}`);
  }
  return null;
}

export async function updateDraft(repo: ReviewRepository, userId: string, sessionId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = UpdateDraftRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_request", "The draft update is malformed.");

  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;

  const scenario = getPublicScenarioBySlug(owned.session.scenarioSlug);
  if (!scenario) return notFound("No scenario matches this review.");
  const validationError = validateNodeEdgeIds(scenario, parsed.data.reviewedNodeIds, parsed.data.reviewedEdgeIds);
  if (validationError) return validationError;

  return runMutation(repo, userId, sessionId, async () => {
    await repo.updateDraft(sessionId, parsed.data);
  });
}

export async function addRedline(repo: ReviewRepository, userId: string, sessionId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = RedlineSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_redline", "The redline is malformed.");

  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;

  const scenario = getPublicScenarioBySlug(owned.session.scenarioSlug);
  if (!scenario) return notFound("No scenario matches this review.");
  const redline: Redline = parsed.data;
  const targetExists =
    redline.targetType === "node" ? scenario.nodes.some((n) => n.id === redline.targetId) : scenario.edges.some((e) => e.id === redline.targetId);
  if (!targetExists) return badRequest("invalid_redline_target", `Unknown ${redline.targetType} id: ${redline.targetId}`);

  return runMutation(repo, userId, sessionId, async () => {
    await repo.saveRedline(sessionId, redline);
  });
}

export async function updateRedline(
  repo: ReviewRepository,
  userId: string,
  sessionId: string,
  redlineId: string,
  body: unknown,
): Promise<ServiceResult<ReviewSession>> {
  const parsed = RedlineDraftPatchSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_redline", "The redline update is malformed.");

  return runMutation(repo, userId, sessionId, async () => {
    await repo.updateRedline(sessionId, redlineId, parsed.data);
  });
}

export async function deleteRedline(repo: ReviewRepository, userId: string, sessionId: string, redlineId: string): Promise<ServiceResult<ReviewSession>> {
  return runMutation(repo, userId, sessionId, async () => {
    await repo.deleteRedline(sessionId, redlineId);
  });
}

export async function addTranscriptTurn(repo: ReviewRepository, userId: string, sessionId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = TranscriptTurnRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_transcript_turn", "The transcript turn is malformed.");

  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;

  const turn: ArchitectConversationTurn = parsed.data.turn;
  return runMutation(repo, userId, sessionId, async () => {
    await repo.saveTranscriptTurn(sessionId, parsed.data.conversationId, turn);
  });
}

export async function saveStressProgress(repo: ReviewRepository, userId: string, sessionId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = StressProgressRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_stress_progress", "The stress-test progress update is malformed.");

  const owned = await requireOwnedSession(repo, userId, sessionId);
  if (!owned.ok) return owned;

  const scenario = getInternalScenarioBySlug(owned.session.scenarioSlug);
  if (!scenario) return notFound("No scenario matches this review.");
  if (!scenario.stressTests.some((t) => t.id === parsed.data.stressTestId)) {
    return badRequest("invalid_stress_test", `Unknown stress test id: ${parsed.data.stressTestId}`);
  }

  return runMutation(repo, userId, sessionId, async () => {
    await repo.saveStressProgress(sessionId, parsed.data);
  });
}

export async function submitSession(repo: ReviewRepository, userId: string, sessionId: string, body: unknown): Promise<ServiceResult<ReviewSession>> {
  const parsed = SubmitSessionRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_submission", "A recommendation and final rationale are required.");

  return runMutation(repo, userId, sessionId, async (session) => {
    await repo.submitSession(session.id, parsed.data);
  });
}
