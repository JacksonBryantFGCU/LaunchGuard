import type {
  ScenarioConfidence,
  ScenarioSeverity,
  ScenarioEvaluationResult,
  ArchitectureModification,
  SimulationBottleneck,
  SimulationRequirementResult,
  StressParameterValues,
} from "@redline/shared";
import type { PracticeScenarioStatus } from "../services/practiceScenarioStateMachine.js";
import type {
  EvidenceSourceType,
  NewPracticeScenarioEvidenceInput,
  PracticeScenarioAttemptRecord,
  PracticeScenarioEvidenceRecord,
  PracticeScenarioResponseDraftPatch,
  PracticeScenarioResponseRecord,
  PracticeScenarioResultRecord,
  NewStressSimulationRunInput,
  StressSimulationRunRecord,
} from "../services/practiceScenarioRepository.js";

// Pure row<->domain mapping only - no Supabase client calls in this file.

export interface AttemptRow {
  id: string;
  review_session_id: string;
  practice_scenario_id: string;
  status: PracticeScenarioStatus;
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toAttemptRecord(row: AttemptRow): PracticeScenarioAttemptRecord {
  return {
    id: row.id,
    reviewSessionId: row.review_session_id,
    practiceScenarioId: row.practice_scenario_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ResponseRow {
  diagnosis: string;
  investigation_plan: string;
  immediate_action: string;
  architecture_decision: string;
  tradeoff: string;
  severity: ScenarioSeverity | null;
  confidence: ScenarioConfidence | null;
  submitted_at: string | null;
}

export function toResponseRecord(row: ResponseRow): PracticeScenarioResponseRecord {
  return {
    diagnosis: row.diagnosis,
    investigationPlan: row.investigation_plan,
    immediateAction: row.immediate_action,
    architectureDecision: row.architecture_decision,
    tradeoff: row.tradeoff,
    severity: row.severity,
    confidence: row.confidence,
    submittedAt: row.submitted_at,
  };
}

export function responseDraftPatchToRow(patch: PracticeScenarioResponseDraftPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.diagnosis !== undefined) row.diagnosis = patch.diagnosis;
  if (patch.investigationPlan !== undefined) row.investigation_plan = patch.investigationPlan;
  if (patch.immediateAction !== undefined) row.immediate_action = patch.immediateAction;
  if (patch.architectureDecision !== undefined) row.architecture_decision = patch.architectureDecision;
  if (patch.tradeoff !== undefined) row.tradeoff = patch.tradeoff;
  if (patch.severity !== undefined) row.severity = patch.severity;
  if (patch.confidence !== undefined) row.confidence = patch.confidence;
  return row;
}

export interface EvidenceRow {
  id: string;
  attempt_id: string;
  source_type: EvidenceSourceType;
  source_id: string | null;
  label: string;
  content: string;
  transcript_turn_id: string | null;
  created_at: string;
}

export function toEvidenceRecord(row: EvidenceRow): PracticeScenarioEvidenceRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    label: row.label,
    content: row.content,
    transcriptTurnId: row.transcript_turn_id,
    createdAt: row.created_at,
  };
}

export function evidenceInputToRow(attemptId: string, input: NewPracticeScenarioEvidenceInput): Record<string, unknown> {
  return {
    attempt_id: attemptId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    label: input.label,
    content: input.content,
    transcript_turn_id: input.transcriptTurnId ?? null,
  };
}

export interface ResultRow {
  objective_score: number;
  objective_max_score: number;
  result_data: ScenarioEvaluationResult;
  created_at: string;
  updated_at: string;
}

export function toResultRecord(row: ResultRow): PracticeScenarioResultRecord {
  return {
    objectiveScore: row.objective_score,
    objectiveMaxScore: row.objective_max_score,
    resultData: row.result_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface StressSimulationRunRow {
  id: string;
  attempt_id: string;
  test_id: string;
  run_number: number;
  parameters: StressParameterValues;
  modifications: ArchitectureModification[];
  passed: boolean;
  final_metrics: Record<string, number>;
  requirement_results: SimulationRequirementResult[];
  bottlenecks: SimulationBottleneck[];
  summary: string;
  created_at: string;
}

export function toStressSimulationRunRecord(row: StressSimulationRunRow): StressSimulationRunRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    testId: row.test_id,
    runNumber: row.run_number,
    parameters: row.parameters,
    modifications: row.modifications,
    passed: row.passed,
    finalMetrics: row.final_metrics,
    requirementResults: row.requirement_results,
    bottlenecks: row.bottlenecks,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

export function stressSimulationRunInputToRow(attemptId: string, runNumber: number, input: NewStressSimulationRunInput): Record<string, unknown> {
  return {
    attempt_id: attemptId,
    test_id: input.testId,
    run_number: runNumber,
    parameters: input.parameters,
    modifications: input.modifications,
    passed: input.passed,
    final_metrics: input.finalMetrics,
    requirement_results: input.requirementResults,
    bottlenecks: input.bottlenecks,
    summary: input.summary,
  };
}
