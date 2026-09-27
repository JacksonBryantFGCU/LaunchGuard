import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScenarioEvaluationResult } from "@redline/shared";
import { InMemoryPracticeScenarioRepository, AttemptLockedError, type NewStressSimulationRunInput } from "./practiceScenarioRepository.js";

const SESSION_A = "session-a";
const SCENARIO_1 = "checkout-latency-spike";
const SCENARIO_2 = "payment-provider-degradation";

// --- create attempt (spec section 17) ---------------------------------

test("createPracticeScenarioAttempt creates one attempt for review + scenario", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  assert.equal(attempt.reviewSessionId, SESSION_A);
  assert.equal(attempt.practiceScenarioId, SCENARIO_1);
  assert.equal(attempt.status, "investigating");
  assert.equal(attempt.submittedAt, null);
  assert.equal(attempt.completedAt, null);
  assert.ok(attempt.id.length > 0);
});

test("createPracticeScenarioAttempt is idempotent per review+scenario (get-or-create)", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const first = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const second = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  assert.equal(first.id, second.id);
  assert.equal((await repo.listPracticeScenarioAttempts(SESSION_A)).length, 1);
});

test("different scenarios under the same review get separate attempts", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const a = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const b = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_2);
  assert.notEqual(a.id, b.id);
  assert.equal((await repo.listPracticeScenarioAttempts(SESSION_A)).length, 2);
});

test("getPracticeScenarioAttempt returns undefined when no attempt exists yet", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  assert.equal(await repo.getPracticeScenarioAttempt(SESSION_A, SCENARIO_1), undefined);
});

// --- draft response (spec section 18) ----------------------------------

test("savePracticeScenarioResponseDraft saves and updates every field", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  await repo.savePracticeScenarioResponseDraft(attempt.id, { diagnosis: "Database contention" });
  await repo.savePracticeScenarioResponseDraft(attempt.id, {
    investigationPlan: "Check connection counts",
    immediateAction: "Add pooling",
    architectureDecision: "Add a pooler",
    tradeoff: "More moving parts",
    severity: "high",
    confidence: "medium",
  });

  const response = await repo.getPracticeScenarioResponse(attempt.id);
  assert.equal(response.diagnosis, "Database contention");
  assert.equal(response.investigationPlan, "Check connection counts");
  assert.equal(response.immediateAction, "Add pooling");
  assert.equal(response.architectureDecision, "Add a pooler");
  assert.equal(response.tradeoff, "More moving parts");
  assert.equal(response.severity, "high");
  assert.equal(response.confidence, "medium");
});

test("a second draft save updates in place rather than duplicating", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.savePracticeScenarioResponseDraft(attempt.id, { diagnosis: "first" });
  await repo.savePracticeScenarioResponseDraft(attempt.id, { diagnosis: "second" });
  const response = await repo.getPracticeScenarioResponse(attempt.id);
  assert.equal(response.diagnosis, "second");
});

test("draft response starts empty and restores exactly what was saved", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const fresh = await repo.getPracticeScenarioResponse(attempt.id);
  assert.deepEqual(fresh, {
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

// --- requirement selection (spec section 19) ---------------------------

test("setPracticeScenarioRequirements replaces the previous selection", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  await repo.setPracticeScenarioRequirements(attempt.id, ["req-latency", "req-throughput"]);
  assert.deepEqual(await repo.getPracticeScenarioRequirements(attempt.id), ["req-latency", "req-throughput"]);

  await repo.setPracticeScenarioRequirements(attempt.id, ["req-availability"]);
  assert.deepEqual(await repo.getPracticeScenarioRequirements(attempt.id), ["req-availability"]);
});

test("setPracticeScenarioRequirements supports clearing to an empty selection", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.setPracticeScenarioRequirements(attempt.id, ["req-latency"]);
  await repo.setPracticeScenarioRequirements(attempt.id, []);
  assert.deepEqual(await repo.getPracticeScenarioRequirements(attempt.id), []);
});

test("setPracticeScenarioRequirements de-duplicates", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.setPracticeScenarioRequirements(attempt.id, ["req-latency", "req-latency"]);
  assert.deepEqual(await repo.getPracticeScenarioRequirements(attempt.id), ["req-latency"]);
});

// --- evidence (spec section 20) ----------------------------------------

test("addPracticeScenarioEvidence supports every evidence source type", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  const requirementEvidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "requirement",
    sourceId: "req-latency",
    label: "Checkout latency requirement",
    content: "p95 < 800ms",
  });
  const nodeEvidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "architecture_node",
    sourceId: "postgres",
    label: "Orders DB",
    content: "Single primary region",
  });
  const edgeEvidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "architecture_edge",
    sourceId: "checkout-service-postgres",
    label: "Checkout -> Postgres",
    content: "Strong consistency",
  });
  const scenarioEvidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "scenario_evidence",
    sourceId: "ev-db-connections",
    label: "Max connections",
    content: "500",
  });
  const architectEvidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "architect_statement",
    sourceId: null,
    label: "Alex on retries",
    content: "We retry three times at the HTTP client level.",
    transcriptTurnId: "turn-1",
  });

  const evidence = await repo.listPracticeScenarioEvidence(attempt.id);
  assert.equal(evidence.length, 5);
  assert.ok(evidence.some((e) => e.id === requirementEvidence.id && e.sourceType === "requirement"));
  assert.ok(evidence.some((e) => e.id === nodeEvidence.id && e.sourceType === "architecture_node"));
  assert.ok(evidence.some((e) => e.id === edgeEvidence.id && e.sourceType === "architecture_edge"));
  assert.ok(evidence.some((e) => e.id === scenarioEvidence.id && e.sourceType === "scenario_evidence"));
  assert.ok(evidence.some((e) => e.id === architectEvidence.id && e.transcriptTurnId === "turn-1"));
});

test("removePracticeScenarioEvidence removes exactly one item", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const evidence = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "requirement",
    sourceId: "req-latency",
    label: "Latency requirement",
    content: "p95 < 800ms",
  });
  await repo.removePracticeScenarioEvidence(attempt.id, evidence.id);
  assert.equal((await repo.listPracticeScenarioEvidence(attempt.id)).length, 0);
});

// --- response evidence linking (spec section 21) ------------------------

test("setResponseEvidence selects and replaces the response's linked evidence", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const e1 = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "requirement",
    sourceId: "req-latency",
    label: "l",
    content: "c",
  });
  const e2 = await repo.addPracticeScenarioEvidence(attempt.id, {
    sourceType: "scenario_evidence",
    sourceId: "ev-db-connections",
    label: "l",
    content: "c",
  });

  await repo.setResponseEvidence(attempt.id, [e1.id]);
  assert.deepEqual(await repo.getResponseEvidenceIds(attempt.id), [e1.id]);

  await repo.setResponseEvidence(attempt.id, [e2.id]);
  assert.deepEqual(await repo.getResponseEvidenceIds(attempt.id), [e2.id]);
});

test("setResponseEvidence rejects evidence belonging to a different attempt", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attemptA = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const attemptB = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_2);
  const evidenceOnB = await repo.addPracticeScenarioEvidence(attemptB.id, {
    sourceType: "requirement",
    sourceId: "req-latency",
    label: "l",
    content: "c",
  });

  await assert.rejects(() => repo.setResponseEvidence(attemptA.id, [evidenceOnB.id]));
});

// --- submission (spec section 22) --------------------------------------

test("submitPracticeScenarioResponse transitions status and records submittedAt", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  const submitted = await repo.submitPracticeScenarioResponse(attempt.id);
  assert.equal(submitted.status, "submitted");
  assert.ok(submitted.submittedAt);
});

test("response/evidence/requirements become immutable after submission", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);

  await assert.rejects(
    () => repo.savePracticeScenarioResponseDraft(attempt.id, { diagnosis: "too late" }),
    AttemptLockedError,
  );
  await assert.rejects(
    () => repo.setPracticeScenarioRequirements(attempt.id, ["req-latency"]),
    AttemptLockedError,
  );
  await assert.rejects(
    () =>
      repo.addPracticeScenarioEvidence(attempt.id, {
        sourceType: "requirement",
        sourceId: "req-latency",
        label: "l",
        content: "c",
      }),
    AttemptLockedError,
  );
});

test("a second submission conflicts", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);
  await assert.rejects(() => repo.submitPracticeScenarioResponse(attempt.id), AttemptLockedError);
});

// --- result persistence (spec section 23) -------------------------------

function fakeResultData(overrides: Partial<ScenarioEvaluationResult> = {}): ScenarioEvaluationResult {
  return {
    scenarioId: SCENARIO_1,
    objectiveScore: 10,
    maxObjectiveScore: 16,
    diagnosisScore: 4,
    evidenceRequirementScore: 2,
    immediateActionScore: 2,
    architectureDecisionScore: 2,
    diagnosisConcepts: [],
    immediateActionConcepts: [],
    architectureDecisionConcepts: [],
    matchedRequirementIds: [],
    missedRequirementIds: [],
    evidenceUsed: false,
    submittedSeverity: "low",
    expectedSeverity: "high",
    severityAligned: false,
    ...overrides,
  };
}

test("savePracticeScenarioResult saves and loads one result per attempt", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);

  await repo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: 10,
    objectiveMaxScore: 16,
    resultData: fakeResultData(),
  });

  const result = await repo.getPracticeScenarioResult(attempt.id);
  assert.equal(result?.objectiveScore, 10);
  assert.equal(result?.objectiveMaxScore, 16);
  assert.equal((result?.resultData as { objectiveScore: number }).objectiveScore, 10);
});

test("savePracticeScenarioResult upserts rather than duplicating on recompute", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);

  await repo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: 10,
    objectiveMaxScore: 16,
    resultData: fakeResultData({ objectiveScore: 10 }),
  });
  await repo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: 12,
    objectiveMaxScore: 16,
    resultData: fakeResultData({ objectiveScore: 12 }),
  });

  const result = await repo.getPracticeScenarioResult(attempt.id);
  assert.equal(result?.objectiveScore, 12);
});

test("savePracticeScenarioResult transitions the attempt to feedback_ready", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);
  await repo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: 10,
    objectiveMaxScore: 16,
    resultData: fakeResultData(),
  });
  const refreshed = await repo.getPracticeScenarioAttemptById(attempt.id);
  assert.equal(refreshed?.status, "feedback_ready");
});

// --- completion progression (spec section 24) ---------------------------

test("status progresses investigating -> submitted -> feedback_ready -> consequence_ready -> completed", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  assert.equal(attempt.status, "investigating");

  await repo.submitPracticeScenarioResponse(attempt.id);
  await repo.savePracticeScenarioResult(attempt.id, {
    objectiveScore: 10,
    objectiveMaxScore: 16,
    resultData: fakeResultData(),
  });
  const afterResult = await repo.getPracticeScenarioAttemptById(attempt.id);
  assert.equal(afterResult?.status, "feedback_ready");

  const consequenceReady = await repo.markScenarioConsequenceReady(attempt.id);
  assert.equal(consequenceReady.status, "consequence_ready");

  const completed = await repo.completePracticeScenario(attempt.id);
  assert.equal(completed.status, "completed");
  assert.ok(completed.completedAt);
});

test("cannot mark consequence ready before feedback is ready", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await assert.rejects(() => repo.markScenarioConsequenceReady(attempt.id));
});

test("cannot complete before consequence is ready", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  await repo.submitPracticeScenarioResponse(attempt.id);
  await assert.rejects(() => repo.completePracticeScenario(attempt.id));
});

// --- stress simulation runs ---------------------------------------------

function fakeRunInput(overrides: Partial<NewStressSimulationRunInput> = {}): NewStressSimulationRunInput {
  return {
    testId: "sustained-load",
    parameters: { requestsPerMinute: 15000 },
    modifications: [],
    passed: true,
    finalMetrics: { checkoutP95Ms: 400 },
    requirementResults: [{ requirementId: "req-throughput", status: "met", explanation: "ok" }],
    bottlenecks: [],
    summary: "All requirements held throughout the run.",
    ...overrides,
  };
}

test("saveStressSimulationRun assigns an incrementing run number per attempt+test", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  const first = await repo.saveStressSimulationRun(attempt.id, fakeRunInput());
  const second = await repo.saveStressSimulationRun(attempt.id, fakeRunInput({ passed: false }));
  assert.equal(first.runNumber, 1);
  assert.equal(second.runNumber, 2);
});

test("run numbers are independent per test id", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  await repo.saveStressSimulationRun(attempt.id, fakeRunInput({ testId: "sustained-load" }));
  const firstSpike = await repo.saveStressSimulationRun(attempt.id, fakeRunInput({ testId: "traffic-spike" }));
  assert.equal(firstSpike.runNumber, 1);
});

test("listStressSimulationRuns returns every run for an attempt, oldest first, and never mutates a prior run", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);

  await repo.saveStressSimulationRun(attempt.id, fakeRunInput({ passed: false }));
  await repo.saveStressSimulationRun(attempt.id, fakeRunInput({ passed: true }));

  const runs = await repo.listStressSimulationRuns(attempt.id);
  assert.equal(runs.length, 2);
  assert.equal(runs[0]!.passed, false);
  assert.equal(runs[1]!.passed, true);
});

test("listStressSimulationRuns for an attempt with no runs yet returns an empty list", async () => {
  const repo = new InMemoryPracticeScenarioRepository();
  const attempt = await repo.createPracticeScenarioAttempt(SESSION_A, SCENARIO_1);
  assert.deepEqual(await repo.listStressSimulationRuns(attempt.id), []);
});
