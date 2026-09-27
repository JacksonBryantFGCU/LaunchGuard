import { randomUUID } from "node:crypto";
import type {
  ArchitectureModification,
  ScenarioConfidence,
  ScenarioSeverity,
  ScenarioEvaluationResult,
  SimulationBottleneck,
  SimulationRequirementResult,
  StressParameterValues,
} from "@purgatory/shared";
import { canTransitionPracticeScenarioStatus, type PracticeScenarioStatus } from "./practiceScenarioStateMachine.js";

export type { PracticeScenarioStatus } from "./practiceScenarioStateMachine.js";

export interface PracticeScenarioAttemptRecord {
  id: string;
  reviewSessionId: string;
  practiceScenarioId: string;
  status: PracticeScenarioStatus;
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeScenarioResponseRecord {
  diagnosis: string;
  investigationPlan: string;
  immediateAction: string;
  architectureDecision: string;
  tradeoff: string;
  severity: ScenarioSeverity | null;
  confidence: ScenarioConfidence | null;
  submittedAt: string | null;
}

export interface PracticeScenarioResponseDraftPatch {
  diagnosis?: string;
  investigationPlan?: string;
  immediateAction?: string;
  architectureDecision?: string;
  tradeoff?: string;
  severity?: ScenarioSeverity;
  confidence?: ScenarioConfidence;
}

export const EVIDENCE_SOURCE_TYPES = [
  "requirement",
  "constraint",
  "scenario_evidence",
  "architecture_node",
  "architecture_edge",
  "architect_statement",
  "architecture_finding",
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export interface NewPracticeScenarioEvidenceInput {
  sourceType: EvidenceSourceType;
  sourceId: string | null;
  label: string;
  content: string;
  transcriptTurnId?: string | null;
}

export interface PracticeScenarioEvidenceRecord {
  id: string;
  attemptId: string;
  sourceType: EvidenceSourceType;
  sourceId: string | null;
  label: string;
  content: string;
  transcriptTurnId: string | null;
  createdAt: string;
}

export interface PracticeScenarioResultInput {
  objectiveScore: number;
  objectiveMaxScore: number;
  resultData: ScenarioEvaluationResult;
}

export interface PracticeScenarioResultRecord extends PracticeScenarioResultInput {
  createdAt: string;
  updatedAt: string;
}

// Immutable stress-test run record (spec #34/#35): only the final aggregate
// is persisted, never the frame timeline - it's deterministically
// regenerated from parameters + modifications on demand.
export interface NewStressSimulationRunInput {
  testId: string;
  parameters: StressParameterValues;
  modifications: ArchitectureModification[];
  passed: boolean;
  finalMetrics: Record<string, number>;
  requirementResults: SimulationRequirementResult[];
  bottlenecks: SimulationBottleneck[];
  summary: string;
}

export interface StressSimulationRunRecord extends NewStressSimulationRunInput {
  id: string;
  attemptId: string;
  runNumber: number;
  createdAt: string;
}

// Thrown when a mutation targets an attempt that is already submitted (the
// response/requirements/evidence are locked), or when a status transition
// is attempted out of order. Mirrors ReviewRepository's SessionLockedError.
export class AttemptLockedError extends Error {
  constructor(attemptId: string, reason = "is locked") {
    super(`Practice scenario attempt ${attemptId} ${reason}.`);
    this.name = "AttemptLockedError";
  }
}

export interface PracticeScenarioRepository {
  createPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord>;
  getPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord | undefined>;
  getPracticeScenarioAttemptById(attemptId: string): Promise<PracticeScenarioAttemptRecord | undefined>;
  listPracticeScenarioAttempts(reviewSessionId: string): Promise<PracticeScenarioAttemptRecord[]>;

  savePracticeScenarioResponseDraft(attemptId: string, patch: PracticeScenarioResponseDraftPatch): Promise<void>;
  getPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioResponseRecord>;

  setPracticeScenarioRequirements(attemptId: string, requirementIds: string[]): Promise<void>;
  getPracticeScenarioRequirements(attemptId: string): Promise<string[]>;

  addPracticeScenarioEvidence(attemptId: string, input: NewPracticeScenarioEvidenceInput): Promise<PracticeScenarioEvidenceRecord>;
  removePracticeScenarioEvidence(attemptId: string, evidenceId: string): Promise<void>;
  listPracticeScenarioEvidence(attemptId: string): Promise<PracticeScenarioEvidenceRecord[]>;

  setResponseEvidence(attemptId: string, evidenceIds: string[]): Promise<void>;
  getResponseEvidenceIds(attemptId: string): Promise<string[]>;

  submitPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioAttemptRecord>;

  savePracticeScenarioResult(attemptId: string, input: PracticeScenarioResultInput): Promise<void>;
  getPracticeScenarioResult(attemptId: string): Promise<PracticeScenarioResultRecord | undefined>;

  markScenarioConsequenceReady(attemptId: string): Promise<PracticeScenarioAttemptRecord>;
  completePracticeScenario(attemptId: string): Promise<PracticeScenarioAttemptRecord>;

  saveStressSimulationRun(attemptId: string, input: NewStressSimulationRunInput): Promise<StressSimulationRunRecord>;
  listStressSimulationRuns(attemptId: string): Promise<StressSimulationRunRecord[]>;
}

const emptyResponse = (): PracticeScenarioResponseRecord => ({
  diagnosis: "",
  investigationPlan: "",
  immediateAction: "",
  architectureDecision: "",
  tradeoff: "",
  severity: null,
  confidence: null,
  submittedAt: null,
});

// Deterministic, in-process only - lost on restart. Reference implementation
// for the contract tests, and the fallback for local dev without Supabase
// (same role InMemoryReviewRepository plays for review sessions).
export class InMemoryPracticeScenarioRepository implements PracticeScenarioRepository {
  private attempts = new Map<string, PracticeScenarioAttemptRecord>();
  private responses = new Map<string, PracticeScenarioResponseRecord>();
  private requirements = new Map<string, string[]>();
  private evidence = new Map<string, PracticeScenarioEvidenceRecord[]>();
  private responseEvidenceIds = new Map<string, string[]>();
  private results = new Map<string, PracticeScenarioResultRecord>();
  private stressRuns = new Map<string, StressSimulationRunRecord[]>();

  private requireAttempt(attemptId: string): PracticeScenarioAttemptRecord {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error(`Practice scenario attempt ${attemptId} does not exist.`);
    return attempt;
  }

  private requireUnsubmitted(attemptId: string): PracticeScenarioAttemptRecord {
    const attempt = this.requireAttempt(attemptId);
    if (attempt.status !== "investigating") {
      throw new AttemptLockedError(attemptId, "has already been submitted and can no longer be modified");
    }
    return attempt;
  }

  private transition(attemptId: string, to: PracticeScenarioStatus): PracticeScenarioAttemptRecord {
    const attempt = this.requireAttempt(attemptId);
    if (!canTransitionPracticeScenarioStatus(attempt.status, to)) {
      throw new AttemptLockedError(attemptId, `cannot move from ${attempt.status} to ${to}`);
    }
    const updated: PracticeScenarioAttemptRecord = { ...attempt, status: to, updatedAt: new Date().toISOString() };
    this.attempts.set(attemptId, updated);
    return updated;
  }

  async createPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord> {
    const existing = await this.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const attempt: PracticeScenarioAttemptRecord = {
      id: randomUUID(),
      reviewSessionId,
      practiceScenarioId,
      status: "investigating",
      startedAt: now,
      submittedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.set(attempt.id, attempt);
    this.responses.set(attempt.id, emptyResponse());
    this.requirements.set(attempt.id, []);
    this.evidence.set(attempt.id, []);
    this.responseEvidenceIds.set(attempt.id, []);
    return attempt;
  }

  async getPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord | undefined> {
    for (const attempt of this.attempts.values()) {
      if (attempt.reviewSessionId === reviewSessionId && attempt.practiceScenarioId === practiceScenarioId) return attempt;
    }
    return undefined;
  }

  async getPracticeScenarioAttemptById(attemptId: string): Promise<PracticeScenarioAttemptRecord | undefined> {
    return this.attempts.get(attemptId);
  }

  async listPracticeScenarioAttempts(reviewSessionId: string): Promise<PracticeScenarioAttemptRecord[]> {
    return [...this.attempts.values()].filter((a) => a.reviewSessionId === reviewSessionId);
  }

  async savePracticeScenarioResponseDraft(attemptId: string, patch: PracticeScenarioResponseDraftPatch): Promise<void> {
    this.requireUnsubmitted(attemptId);
    const existing = this.responses.get(attemptId) ?? emptyResponse();
    this.responses.set(attemptId, { ...existing, ...patch });
  }

  async getPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioResponseRecord> {
    this.requireAttempt(attemptId);
    return this.responses.get(attemptId) ?? emptyResponse();
  }

  async setPracticeScenarioRequirements(attemptId: string, requirementIds: string[]): Promise<void> {
    this.requireUnsubmitted(attemptId);
    this.requirements.set(attemptId, [...new Set(requirementIds)]);
  }

  async getPracticeScenarioRequirements(attemptId: string): Promise<string[]> {
    this.requireAttempt(attemptId);
    return this.requirements.get(attemptId) ?? [];
  }

  async addPracticeScenarioEvidence(
    attemptId: string,
    input: NewPracticeScenarioEvidenceInput,
  ): Promise<PracticeScenarioEvidenceRecord> {
    this.requireUnsubmitted(attemptId);
    const record: PracticeScenarioEvidenceRecord = {
      id: randomUUID(),
      attemptId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      label: input.label,
      content: input.content,
      transcriptTurnId: input.transcriptTurnId ?? null,
      createdAt: new Date().toISOString(),
    };
    const existing = this.evidence.get(attemptId) ?? [];
    this.evidence.set(attemptId, [...existing, record]);
    return record;
  }

  async removePracticeScenarioEvidence(attemptId: string, evidenceId: string): Promise<void> {
    this.requireUnsubmitted(attemptId);
    const existing = this.evidence.get(attemptId) ?? [];
    this.evidence.set(attemptId, existing.filter((e) => e.id !== evidenceId));
    const selected = this.responseEvidenceIds.get(attemptId) ?? [];
    this.responseEvidenceIds.set(attemptId, selected.filter((id) => id !== evidenceId));
  }

  async listPracticeScenarioEvidence(attemptId: string): Promise<PracticeScenarioEvidenceRecord[]> {
    this.requireAttempt(attemptId);
    return this.evidence.get(attemptId) ?? [];
  }

  async setResponseEvidence(attemptId: string, evidenceIds: string[]): Promise<void> {
    this.requireUnsubmitted(attemptId);
    const validIds = new Set((this.evidence.get(attemptId) ?? []).map((e) => e.id));
    for (const id of evidenceIds) {
      if (!validIds.has(id)) {
        throw new Error(`Evidence ${id} does not belong to practice scenario attempt ${attemptId}.`);
      }
    }
    this.responseEvidenceIds.set(attemptId, [...new Set(evidenceIds)]);
  }

  async getResponseEvidenceIds(attemptId: string): Promise<string[]> {
    this.requireAttempt(attemptId);
    return this.responseEvidenceIds.get(attemptId) ?? [];
  }

  async submitPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    this.requireUnsubmitted(attemptId);
    const submittedAt = new Date().toISOString();
    const attempt = this.transition(attemptId, "submitted");
    const withTimestamp: PracticeScenarioAttemptRecord = { ...attempt, submittedAt };
    this.attempts.set(attemptId, withTimestamp);
    const response = this.responses.get(attemptId) ?? emptyResponse();
    this.responses.set(attemptId, { ...response, submittedAt });
    return withTimestamp;
  }

  async savePracticeScenarioResult(attemptId: string, input: PracticeScenarioResultInput): Promise<void> {
    const attempt = this.requireAttempt(attemptId);
    const now = new Date().toISOString();
    const existing = this.results.get(attemptId);
    this.results.set(attemptId, { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now });

    if (attempt.status === "submitted") this.transition(attemptId, "feedback_ready");
  }

  async getPracticeScenarioResult(attemptId: string): Promise<PracticeScenarioResultRecord | undefined> {
    this.requireAttempt(attemptId);
    return this.results.get(attemptId);
  }

  async markScenarioConsequenceReady(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    return this.transition(attemptId, "consequence_ready");
  }

  async completePracticeScenario(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    const completed = this.transition(attemptId, "completed");
    const withTimestamp: PracticeScenarioAttemptRecord = { ...completed, completedAt: new Date().toISOString() };
    this.attempts.set(attemptId, withTimestamp);
    return withTimestamp;
  }

  async saveStressSimulationRun(attemptId: string, input: NewStressSimulationRunInput): Promise<StressSimulationRunRecord> {
    this.requireAttempt(attemptId);
    const existing = this.stressRuns.get(attemptId) ?? [];
    const runNumber = existing.filter((r) => r.testId === input.testId).length + 1;
    const record: StressSimulationRunRecord = {
      ...input,
      id: randomUUID(),
      attemptId,
      runNumber,
      createdAt: new Date().toISOString(),
    };
    this.stressRuns.set(attemptId, [...existing, record]);
    return record;
  }

  async listStressSimulationRuns(attemptId: string): Promise<StressSimulationRunRecord[]> {
    this.requireAttempt(attemptId);
    return this.stressRuns.get(attemptId) ?? [];
  }
}
