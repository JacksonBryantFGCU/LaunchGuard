import { z } from "zod";
import {
  ReviewSessionSchema,
  ReviewHistoryItemSchema,
  type ReviewSession,
  type ReviewHistoryItem,
  type Redline,
  type ArchitectConversationTurn,
  type StressProgress,
} from "@redline/shared";
import { apiGet, apiPatch, apiPost, apiDelete } from "../../lib/api/client.js";

const parseSession = (data: unknown) => ReviewSessionSchema.parse(data);

export function startOrResumeReviewSession(scenarioSlug: string): Promise<ReviewSession> {
  return apiPost("/api/review-sessions", { scenarioSlug }, parseSession, { authed: true });
}

export function getReviewSession(id: string): Promise<ReviewSession> {
  return apiGet(`/api/review-sessions/${encodeURIComponent(id)}`, parseSession, { authed: true });
}

export function updateDraft(
  id: string,
  patch: { reviewedNodeIds?: string[]; reviewedEdgeIds?: string[]; reviewerNotes?: string },
): Promise<ReviewSession> {
  return apiPatch(`/api/review-sessions/${encodeURIComponent(id)}`, patch, parseSession, { authed: true });
}

export function addRedline(id: string, redline: Redline): Promise<ReviewSession> {
  return apiPost(`/api/review-sessions/${encodeURIComponent(id)}/redlines`, redline, parseSession, { authed: true });
}

export function updateRedline(id: string, redlineId: string, draft: Partial<Omit<Redline, "id" | "createdAt">>): Promise<ReviewSession> {
  return apiPatch(`/api/review-sessions/${encodeURIComponent(id)}/redlines/${encodeURIComponent(redlineId)}`, draft, parseSession, {
    authed: true,
  });
}

export function deleteRedline(id: string, redlineId: string): Promise<ReviewSession> {
  return apiDelete(`/api/review-sessions/${encodeURIComponent(id)}/redlines/${encodeURIComponent(redlineId)}`, parseSession, {
    authed: true,
  });
}

export function addTranscriptTurn(id: string, conversationId: string, turn: ArchitectConversationTurn): Promise<ReviewSession> {
  return apiPost(
    `/api/review-sessions/${encodeURIComponent(id)}/transcript-turns`,
    { conversationId, turn },
    parseSession,
    { authed: true },
  );
}

export function saveStressProgress(id: string, progress: StressProgress): Promise<ReviewSession> {
  return apiPost(`/api/review-sessions/${encodeURIComponent(id)}/stress-progress`, progress, parseSession, { authed: true });
}

export function submitReviewSession(
  id: string,
  input: { recommendation: string; finalRationale: string },
): Promise<ReviewSession> {
  return apiPost(`/api/review-sessions/${encodeURIComponent(id)}/submit`, input, parseSession, { authed: true });
}

export function getReviewHistory(): Promise<ReviewHistoryItem[]> {
  return apiGet("/api/reviews", (data) => z.array(ReviewHistoryItemSchema).parse(data), { authed: true });
}
