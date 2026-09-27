import type { PracticeResponseDraft, ScenarioEvaluationResult } from "@redline/shared";

// Dev-only shortcut (spec: preview the scoring page without a full
// investigation -> Stress Lab -> submission run each time) - never
// imported by anything reachable in a production build. PracticeResultPage
// only calls buildMockResult() when import.meta.env.DEV is true, so this
// stays out of the deployed bundle's execution path (Vite still ships the
// dead code; tree-shaking it out isn't worth a build-config change for a
// file this small).
export type MockResultPreset = "pass" | "fail";

const MOCK_RESPONSE: PracticeResponseDraft = {
  diagnosis: "[DEV PREVIEW] Checkout and Inventory share one connection pool against Postgres's connection limit.",
  investigationPlan: "[DEV PREVIEW] Compared active connections against the configured limit during the traffic spike.",
  immediateAction: "[DEV PREVIEW] Add a connection pooler in front of Postgres.",
  architectureDecision: "[DEV PREVIEW] Introduce a read replica and pooling layer.",
  tradeoff: "[DEV PREVIEW] Adds an operational component to run and monitor.",
  severity: "high",
  confidence: "high",
};

function mockResult(preset: MockResultPreset): ScenarioEvaluationResult {
  const pass = preset === "pass";
  return {
    scenarioId: "dev-mock",
    objectiveScore: pass ? 16 : 6,
    maxObjectiveScore: 16,
    diagnosisScore: pass ? 6 : 2,
    evidenceRequirementScore: pass ? 4 : 2,
    immediateActionScore: pass ? 3 : 1,
    architectureDecisionScore: pass ? 3 : 1,
    diagnosisConcepts: [{ id: "c1", label: "Shared connection pool", matched: pass, teaching: "The pool is the actual bottleneck, not either service alone." }],
    immediateActionConcepts: [{ id: "c2", label: "Bounded timeout", matched: pass, teaching: "A bounded timeout stops one slow dependency from exhausting worker capacity." }],
    architectureDecisionConcepts: [{ id: "c3", label: "Connection pooler", matched: pass, teaching: "A pooler caps backend connections instead of letting every instance open its own." }],
    matchedRequirementIds: pass ? ["req-latency", "req-availability"] : ["req-latency"],
    missedRequirementIds: pass ? [] : ["req-availability"],
    evidenceUsed: pass,
    submittedSeverity: "high",
    expectedSeverity: "high",
    severityAligned: true,
    resilienceScore: pass ? 8 : 0,
    maxResilienceScore: 8,
    resilienceTestResults: [
      { testId: "sustained-load", label: "Sustained Load", passedAtDefaultParameters: pass },
      { testId: "traffic-spike", label: "Traffic Spike", passedAtDefaultParameters: pass },
    ],
    totalScore: pass ? 24 : 6,
    maxTotalScore: 24,
  };
}

export function buildMockAttemptView(scenarioId: string, reviewSessionId: string, preset: MockResultPreset) {
  const result = { ...mockResult(preset), scenarioId };
  return {
    attemptId: "dev-mock-attempt",
    reviewSessionId,
    practiceScenarioId: scenarioId,
    status: "feedback_ready" as const,
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    completedAt: null,
    response: MOCK_RESPONSE,
    affectedRequirementIds: result.matchedRequirementIds,
    evidence: [],
    selectedEvidenceIds: [],
    result,
  };
}
