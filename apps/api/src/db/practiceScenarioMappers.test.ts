import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toAttemptRecord,
  toResponseRecord,
  toEvidenceRecord,
  toResultRecord,
  responseDraftPatchToRow,
  evidenceInputToRow,
  toStressSimulationRunRecord,
  stressSimulationRunInputToRow,
} from "./practiceScenarioMappers.js";

test("toAttemptRecord maps a row with nullable timestamps", () => {
  const record = toAttemptRecord({
    id: "attempt-1",
    review_session_id: "session-1",
    practice_scenario_id: "checkout-latency-spike",
    status: "investigating",
    started_at: "2026-01-01T00:00:00.000Z",
    submitted_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(record.id, "attempt-1");
  assert.equal(record.reviewSessionId, "session-1");
  assert.equal(record.practiceScenarioId, "checkout-latency-spike");
  assert.equal(record.status, "investigating");
  assert.equal(record.submittedAt, null);
  assert.equal(record.completedAt, null);
});

test("toAttemptRecord maps a fully-submitted row", () => {
  const record = toAttemptRecord({
    id: "attempt-1",
    review_session_id: "session-1",
    practice_scenario_id: "checkout-latency-spike",
    status: "completed",
    started_at: "2026-01-01T00:00:00.000Z",
    submitted_at: "2026-01-01T00:05:00.000Z",
    completed_at: "2026-01-01T00:10:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:10:00.000Z",
  });
  assert.equal(record.submittedAt, "2026-01-01T00:05:00.000Z");
  assert.equal(record.completedAt, "2026-01-01T00:10:00.000Z");
});

test("toResponseRecord maps empty strings and null severity/confidence", () => {
  const record = toResponseRecord({
    diagnosis: "",
    investigation_plan: "",
    immediate_action: "",
    architecture_decision: "",
    tradeoff: "",
    severity: null,
    confidence: null,
    submitted_at: null,
  });
  assert.deepEqual(record, {
    diagnosis: "",
    investigationPlan: "",
    immediateAction: "",
    architectureDecision: "",
    tradeoff: "",
    severity: null,
    confidence: null,
    submittedAt: null,
  });
});

test("toResponseRecord maps a filled-out submitted row", () => {
  const record = toResponseRecord({
    diagnosis: "d",
    investigation_plan: "p",
    immediate_action: "a",
    architecture_decision: "dec",
    tradeoff: "t",
    severity: "high",
    confidence: "medium",
    submitted_at: "2026-01-01T00:05:00.000Z",
  });
  assert.equal(record.severity, "high");
  assert.equal(record.confidence, "medium");
  assert.equal(record.submittedAt, "2026-01-01T00:05:00.000Z");
});

test("responseDraftPatchToRow only includes provided fields, snake_cased", () => {
  const row = responseDraftPatchToRow({ diagnosis: "d", severity: "high" });
  assert.deepEqual(row, { diagnosis: "d", severity: "high" });
});

test("responseDraftPatchToRow omits fields not present in the patch", () => {
  const row = responseDraftPatchToRow({ tradeoff: "t" });
  assert.deepEqual(row, { tradeoff: "t" });
  assert.equal("diagnosis" in row, false);
});

test("toEvidenceRecord maps a row with a null sourceId and null transcriptTurnId", () => {
  const record = toEvidenceRecord({
    id: "ev-1",
    attempt_id: "attempt-1",
    source_type: "architect_statement",
    source_id: null,
    label: "Alex on retries",
    content: "We retry three times.",
    transcript_turn_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(record.sourceId, null);
  assert.equal(record.transcriptTurnId, null);
  assert.equal(record.sourceType, "architect_statement");
});

test("evidenceInputToRow maps camelCase input to a snake_case insert row", () => {
  const row = evidenceInputToRow("attempt-1", {
    sourceType: "requirement",
    sourceId: "req-latency",
    label: "Latency requirement",
    content: "p95 < 800ms",
  });
  assert.deepEqual(row, {
    attempt_id: "attempt-1",
    source_type: "requirement",
    source_id: "req-latency",
    label: "Latency requirement",
    content: "p95 < 800ms",
    transcript_turn_id: null,
  });
});

test("toResultRecord preserves the jsonb result_data payload", () => {
  const resultData = { objectiveScore: 10, maxObjectiveScore: 16 } as unknown as import("@redline/shared").ScenarioEvaluationResult;
  const record = toResultRecord({
    objective_score: 10,
    objective_max_score: 16,
    result_data: resultData,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(record.objectiveScore, 10);
  assert.equal(record.objectiveMaxScore, 16);
  assert.deepEqual(record.resultData, resultData);
});

test("toStressSimulationRunRecord maps a row into camelCase, preserving jsonb payloads", () => {
  const record = toStressSimulationRunRecord({
    id: "run-1",
    attempt_id: "attempt-1",
    test_id: "sustained-load",
    run_number: 2,
    parameters: { requestsPerMinute: 15000 },
    modifications: [{ kind: "add-component", id: "m1", componentType: "cache", config: {} }],
    passed: true,
    final_metrics: { checkoutP95Ms: 400 },
    requirement_results: [{ requirementId: "req-throughput", status: "met", explanation: "ok" }],
    bottlenecks: [],
    summary: "All requirements held throughout the run.",
    created_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(record.runNumber, 2);
  assert.equal(record.attemptId, "attempt-1");
  assert.deepEqual(record.parameters, { requestsPerMinute: 15000 });
});

test("stressSimulationRunInputToRow maps camelCase fields into the row's snake_case columns", () => {
  const row = stressSimulationRunInputToRow("attempt-1", 3, {
    testId: "traffic-spike",
    parameters: { spikeRequestsPerMinute: 32000 },
    modifications: [],
    passed: false,
    finalMetrics: { checkoutP95Ms: 3400 },
    requirementResults: [{ requirementId: "req-latency", status: "violated", explanation: "too slow" }],
    bottlenecks: [],
    summary: "1 requirement(s) were violated during the run.",
  });
  assert.equal(row.attempt_id, "attempt-1");
  assert.equal(row.run_number, 3);
  assert.equal(row.test_id, "traffic-spike");
});
