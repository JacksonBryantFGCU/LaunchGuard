import { randomUUID } from "node:crypto";
import type { ArchitectConversationTurn, ArchitectureRecommendation, Redline } from "@purgatory/shared";

export type ReviewSessionStatus = "draft" | "submitted";

export interface ReviewSessionRecord {
  id: string;
  userId: string;
  scenarioSlug: string;
  status: ReviewSessionStatus;
  reviewedNodeIds: string[];
  reviewedEdgeIds: string[];
  reviewerNotes: string;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPatch {
  reviewedNodeIds?: string[];
  reviewedEdgeIds?: string[];
  reviewerNotes?: string;
}

export type RedlineDraftPatch = Partial<Omit<Redline, "id" | "createdAt">>;

export type StressProgressStatus = "not_started" | "running" | "passed" | "failed";

export interface StressProgressRecord {
  stressTestId: string;
  status: StressProgressStatus;
  currentStep: number;
  completedAt: string | null;
}

export interface SubmissionInput {
  recommendation: ArchitectureRecommendation;
  finalRationale: string;
}

export interface SubmissionRecord extends SubmissionInput {
  submittedAt: string;
}

// Thrown by every repository implementation when a mutation targets a
// session that has already moved to "submitted" - submitted reviews are
// immutable. Callers (services/routes) map this to a 409.
export class SessionLockedError extends Error {
  constructor(sessionId: string) {
    super(`Review session ${sessionId} is already submitted and cannot be modified.`);
    this.name = "SessionLockedError";
  }
}

export interface ReviewRepository {
  createSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord>;
  findActiveDraftSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord | undefined>;
  getSession(id: string): Promise<ReviewSessionRecord | undefined>;
  listUserSessions(userId: string): Promise<ReviewSessionRecord[]>;
  updateDraft(id: string, patch: DraftPatch): Promise<ReviewSessionRecord>;

  listRedlines(sessionId: string): Promise<Redline[]>;
  saveRedline(sessionId: string, redline: Redline): Promise<void>;
  updateRedline(sessionId: string, redlineId: string, draft: RedlineDraftPatch): Promise<void>;
  deleteRedline(sessionId: string, redlineId: string): Promise<void>;

  listTranscriptTurns(sessionId: string): Promise<ArchitectConversationTurn[]>;
  saveTranscriptTurn(sessionId: string, conversationId: string, turn: ArchitectConversationTurn): Promise<void>;

  submitSession(
    id: string,
    input: SubmissionInput,
  ): Promise<{ session: ReviewSessionRecord; submission: SubmissionRecord }>;
  getSubmission(sessionId: string): Promise<SubmissionRecord | undefined>;

  saveStressProgress(sessionId: string, progress: StressProgressRecord): Promise<void>;
  listStressProgress(sessionId: string): Promise<StressProgressRecord[]>;
}

// Deterministic, in-process only - lost on restart. Used in production only
// as a clearly-logged fallback when Supabase isn't configured, and always
// used by tests so they never need live credentials.
export class InMemoryReviewRepository implements ReviewRepository {
  private sessions = new Map<string, ReviewSessionRecord>();
  private redlines = new Map<string, Redline[]>();
  private transcripts = new Map<string, ArchitectConversationTurn[]>();
  private submissions = new Map<string, SubmissionRecord>();
  private stressProgress = new Map<string, StressProgressRecord[]>();

  async createSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord> {
    const now = new Date().toISOString();
    const session: ReviewSessionRecord = {
      id: randomUUID(),
      userId,
      scenarioSlug,
      status: "draft",
      reviewedNodeIds: [],
      reviewedEdgeIds: [],
      reviewerNotes: "",
      startedAt: now,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findActiveDraftSession(userId: string, scenarioSlug: string): Promise<ReviewSessionRecord | undefined> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.scenarioSlug === scenarioSlug && session.status === "draft") {
        return session;
      }
    }
    return undefined;
  }

  async getSession(id: string): Promise<ReviewSessionRecord | undefined> {
    return this.sessions.get(id);
  }

  async listUserSessions(userId: string): Promise<ReviewSessionRecord[]> {
    return [...this.sessions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private requireDraftSession(id: string): ReviewSessionRecord {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Review session ${id} does not exist.`);
    if (session.status === "submitted") throw new SessionLockedError(id);
    return session;
  }

  async updateDraft(id: string, patch: DraftPatch): Promise<ReviewSessionRecord> {
    const session = this.requireDraftSession(id);
    const updated: ReviewSessionRecord = { ...session, ...patch, updatedAt: new Date().toISOString() };
    this.sessions.set(id, updated);
    return updated;
  }

  async listRedlines(sessionId: string): Promise<Redline[]> {
    return this.redlines.get(sessionId) ?? [];
  }

  async saveRedline(sessionId: string, redline: Redline): Promise<void> {
    this.requireDraftSession(sessionId);
    const existing = this.redlines.get(sessionId) ?? [];
    this.redlines.set(sessionId, [...existing.filter((r) => r.id !== redline.id), redline]);
  }

  async updateRedline(sessionId: string, redlineId: string, draft: RedlineDraftPatch): Promise<void> {
    this.requireDraftSession(sessionId);
    const existing = this.redlines.get(sessionId) ?? [];
    this.redlines.set(sessionId, existing.map((r) => (r.id === redlineId ? { ...r, ...draft } : r)));
  }

  async deleteRedline(sessionId: string, redlineId: string): Promise<void> {
    this.requireDraftSession(sessionId);
    const existing = this.redlines.get(sessionId) ?? [];
    this.redlines.set(sessionId, existing.filter((r) => r.id !== redlineId));
  }

  async listTranscriptTurns(sessionId: string): Promise<ArchitectConversationTurn[]> {
    return this.transcripts.get(sessionId) ?? [];
  }

  async saveTranscriptTurn(sessionId: string, _conversationId: string, turn: ArchitectConversationTurn): Promise<void> {
    const existing = this.transcripts.get(sessionId) ?? [];
    if (existing.some((t) => t.id === turn.id)) return;
    this.transcripts.set(sessionId, [...existing, turn]);
  }

  async submitSession(
    id: string,
    input: SubmissionInput,
  ): Promise<{ session: ReviewSessionRecord; submission: SubmissionRecord }> {
    const session = this.requireDraftSession(id);
    const submittedAt = new Date().toISOString();
    const submitted: ReviewSessionRecord = { ...session, status: "submitted", submittedAt, updatedAt: submittedAt };
    const submission: SubmissionRecord = { ...input, submittedAt };
    this.sessions.set(id, submitted);
    this.submissions.set(id, submission);
    return { session: submitted, submission };
  }

  async getSubmission(sessionId: string): Promise<SubmissionRecord | undefined> {
    return this.submissions.get(sessionId);
  }

  async saveStressProgress(sessionId: string, progress: StressProgressRecord): Promise<void> {
    const existing = this.stressProgress.get(sessionId) ?? [];
    const next = existing.filter((p) => p.stressTestId !== progress.stressTestId);
    next.push(progress);
    this.stressProgress.set(sessionId, next);
  }

  async listStressProgress(sessionId: string): Promise<StressProgressRecord[]> {
    return this.stressProgress.get(sessionId) ?? [];
  }
}
