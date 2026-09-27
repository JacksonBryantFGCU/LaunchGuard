import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { ArchitectConversationTurn, Redline } from "@purgatory/shared";
import {
  SessionLockedError,
  type DraftPatch,
  type RedlineDraftPatch,
  type ReviewRepository,
  type ReviewSessionRecord,
  type StressProgressRecord,
  type SubmissionInput,
  type SubmissionRecord,
} from "../services/reviewRepository.js";

interface SessionRow {
  id: string;
  user_id: string;
  scenario_slug: string;
  status: "draft" | "submitted";
  reviewed_node_ids: string[];
  reviewed_edge_ids: string[];
  reviewer_notes: string;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

function toSession(row: SessionRow): ReviewSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    scenarioSlug: row.scenario_slug,
    status: row.status,
    reviewedNodeIds: row.reviewed_node_ids,
    reviewedEdgeIds: row.reviewed_edge_ids,
    reviewerNotes: row.reviewer_notes,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface RedlineRow {
  id: string;
  target_type: "node" | "edge";
  target_id: string;
  category: string;
  severity: string;
  title: string;
  reasoning: string;
  created_at: string;
}

function toRedline(row: RedlineRow): Redline {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    category: row.category as Redline["category"],
    severity: row.severity as Redline["severity"],
    title: row.title,
    reasoning: row.reasoning,
    createdAt: row.created_at,
  };
}

interface TranscriptRow {
  turn_id: string;
  speaker: "reviewer" | "architect";
  text: string;
  occurred_at: string;
}

function toTurn(row: TranscriptRow): ArchitectConversationTurn {
  return { id: row.turn_id, speaker: row.speaker, text: row.text, timestamp: row.occurred_at, final: true };
}

// Never leak a raw Supabase/Postgres error (constraint names, internal
// detail) to callers - wrap everything as a generic, safe-to-log error.
class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Review repository operation failed: ${operation}`);
    this.name = "RepositoryError";
    this.cause = cause;
  }
}

export class SupabaseReviewRepository implements ReviewRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord> {
    const { data, error } = await this.client
      .from("review_sessions")
      .insert({ user_id: userId, scenario_slug: scenarioSlug })
      .select()
      .single();
    if (error || !data) throw new RepositoryError("createSession", error);
    return toSession(data as SessionRow);
  }

  async findActiveDraftSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord | undefined> {
    const { data, error } = await this.client
      .from("review_sessions")
      .select()
      .eq("user_id", userId)
      .eq("scenario_slug", scenarioSlug)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new RepositoryError("findActiveDraftSession", error);
    return data ? toSession(data as SessionRow) : undefined;
  }

  async getSession(id: string): Promise<ReviewSessionRecord | undefined> {
    const { data, error } = await this.client.from("review_sessions").select().eq("id", id).maybeSingle();
    if (error) throw new RepositoryError("getSession", error);
    return data ? toSession(data as SessionRow) : undefined;
  }

  async listUserSessions(userId: string): Promise<ReviewSessionRecord[]> {
    const { data, error } = await this.client
      .from("review_sessions")
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new RepositoryError("listUserSessions", error);
    return (data as SessionRow[]).map(toSession);
  }

  async updateDraft(id: string, patch: DraftPatch): Promise<ReviewSessionRecord> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.reviewedNodeIds) payload.reviewed_node_ids = patch.reviewedNodeIds;
    if (patch.reviewedEdgeIds) payload.reviewed_edge_ids = patch.reviewedEdgeIds;
    if (patch.reviewerNotes !== undefined) payload.reviewer_notes = patch.reviewerNotes;

    const { data, error } = await this.client
      .from("review_sessions")
      .update(payload)
      .eq("id", id)
      .eq("status", "draft")
      .select()
      .maybeSingle();
    if (error) throw new RepositoryError("updateDraft", error);
    if (!data) throw new SessionLockedError(id);
    return toSession(data as SessionRow);
  }

  private async requireDraft(id: string): Promise<void> {
    const { data, error } = await this.client.from("review_sessions").select("status").eq("id", id).maybeSingle();
    if (error) throw new RepositoryError("requireDraft", error);
    if (!data || (data as { status: string }).status !== "draft") throw new SessionLockedError(id);
  }

  async listRedlines(sessionId: string): Promise<Redline[]> {
    const { data, error } = await this.client
      .from("review_redlines")
      .select()
      .eq("review_session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw new RepositoryError("listRedlines", error);
    return (data as RedlineRow[]).map(toRedline);
  }

  async saveRedline(sessionId: string, redline: Redline): Promise<void> {
    await this.requireDraft(sessionId);
    const { error } = await this.client.from("review_redlines").upsert({
      id: redline.id,
      review_session_id: sessionId,
      target_type: redline.targetType,
      target_id: redline.targetId,
      category: redline.category,
      severity: redline.severity,
      title: redline.title,
      reasoning: redline.reasoning,
      created_at: redline.createdAt,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new RepositoryError("saveRedline", error);
  }

  async updateRedline(sessionId: string, redlineId: string, draft: RedlineDraftPatch): Promise<void> {
    await this.requireDraft(sessionId);
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (draft.targetType) payload.target_type = draft.targetType;
    if (draft.targetId) payload.target_id = draft.targetId;
    if (draft.category) payload.category = draft.category;
    if (draft.severity) payload.severity = draft.severity;
    if (draft.title) payload.title = draft.title;
    if (draft.reasoning) payload.reasoning = draft.reasoning;

    const { error } = await this.client
      .from("review_redlines")
      .update(payload)
      .eq("id", redlineId)
      .eq("review_session_id", sessionId);
    if (error) throw new RepositoryError("updateRedline", error);
  }

  async deleteRedline(sessionId: string, redlineId: string): Promise<void> {
    await this.requireDraft(sessionId);
    const { error } = await this.client
      .from("review_redlines")
      .delete()
      .eq("id", redlineId)
      .eq("review_session_id", sessionId);
    if (error) throw new RepositoryError("deleteRedline", error);
  }

  async listTranscriptTurns(sessionId: string): Promise<ArchitectConversationTurn[]> {
    const { data, error } = await this.client
      .from("voice_transcript_turns")
      .select()
      .eq("review_session_id", sessionId)
      .order("turn_order", { ascending: true });
    if (error) throw new RepositoryError("listTranscriptTurns", error);
    return (data as TranscriptRow[]).map(toTurn);
  }

  async saveTranscriptTurn(sessionId: string, conversationId: string, turn: ArchitectConversationTurn): Promise<void> {
    // ponytail: turn_order is computed from the current row count, so
    // concurrent writers for the same session could race on ordering.
    // Fine for one reviewer's single active voice call; move to a DB
    // sequence per session if concurrent multi-tab voice sessions matter.
    const { count, error: countError } = await this.client
      .from("voice_transcript_turns")
      .select("id", { count: "exact", head: true })
      .eq("review_session_id", sessionId);
    if (countError) throw new RepositoryError("saveTranscriptTurn:count", countError);

    const { error } = await this.client.from("voice_transcript_turns").upsert(
      {
        id: randomUUID(),
        review_session_id: sessionId,
        conversation_id: conversationId,
        turn_id: turn.id,
        speaker: turn.speaker,
        text: turn.text,
        turn_order: count ?? 0,
        occurred_at: turn.timestamp,
      },
      { onConflict: "review_session_id,turn_id", ignoreDuplicates: true },
    );
    if (error) throw new RepositoryError("saveTranscriptTurn", error);
  }

  async submitSession(id: string, input: SubmissionInput): Promise<{ session: ReviewSessionRecord; submission: SubmissionRecord }> {
    const submittedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from("review_sessions")
      .update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt })
      .eq("id", id)
      .eq("status", "draft")
      .select()
      .maybeSingle();
    if (error) throw new RepositoryError("submitSession", error);
    if (!data) throw new SessionLockedError(id);

    const { error: submissionError } = await this.client.from("review_submissions").insert({
      review_session_id: id,
      recommendation: input.recommendation,
      final_rationale: input.finalRationale,
      submitted_at: submittedAt,
    });
    if (submissionError) throw new RepositoryError("submitSession:insertSubmission", submissionError);

    return { session: toSession(data as SessionRow), submission: { ...input, submittedAt } };
  }

  async getSubmission(sessionId: string): Promise<SubmissionRecord | undefined> {
    const { data, error } = await this.client
      .from("review_submissions")
      .select()
      .eq("review_session_id", sessionId)
      .maybeSingle();
    if (error) throw new RepositoryError("getSubmission", error);
    if (!data) return undefined;
    const row = data as { recommendation: SubmissionRecord["recommendation"]; final_rationale: string; submitted_at: string };
    return { recommendation: row.recommendation, finalRationale: row.final_rationale, submittedAt: row.submitted_at };
  }

  async saveStressProgress(sessionId: string, progress: StressProgressRecord): Promise<void> {
    const { error } = await this.client.from("stress_test_progress").upsert(
      {
        review_session_id: sessionId,
        stress_test_id: progress.stressTestId,
        status: progress.status,
        current_step: progress.currentStep,
        completed_at: progress.completedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "review_session_id,stress_test_id" },
    );
    if (error) throw new RepositoryError("saveStressProgress", error);
  }

  async listStressProgress(sessionId: string): Promise<StressProgressRecord[]> {
    const { data, error } = await this.client.from("stress_test_progress").select().eq("review_session_id", sessionId);
    if (error) throw new RepositoryError("listStressProgress", error);
    return (data as { stress_test_id: string; status: StressProgressRecord["status"]; current_step: number; completed_at: string | null }[]).map(
      (row) => ({ stressTestId: row.stress_test_id, status: row.status, currentStep: row.current_step, completedAt: row.completed_at }),
    );
  }
}
