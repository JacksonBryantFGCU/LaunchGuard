import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PracticeScenarioAttemptSummarySchema,
  PracticeScenarioAttemptViewSchema,
} from "./practiceScenarioAttempt.js";

test("accepts a not-yet-scored attempt summary", () => {
  assert.doesNotThrow(() =>
    PracticeScenarioAttemptSummarySchema.parse({
      practiceScenarioId: "checkout-latency-spike",
      status: "investigating",
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: null,
      completedAt: null,
      objectiveScore: null,
      maxObjectiveScore: null,
    }),
  );
});

test("accepts a fully-formed attempt view with evidence and a result", () => {
  assert.doesNotThrow(() =>
    PracticeScenarioAttemptViewSchema.parse({
      attemptId: "attempt-1",
      reviewSessionId: "session-1",
      practiceScenarioId: "checkout-latency-spike",
      status: "feedback_ready",
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: "2026-01-01T00:05:00.000Z",
      completedAt: null,
      response: {
        diagnosis: "d",
        investigationPlan: "p",
        immediateAction: "a",
        architectureDecision: "dec",
        tradeoff: "t",
        severity: "high",
        confidence: "medium",
      },
      affectedRequirementIds: ["req-latency"],
      evidence: [
        {
          id: "ev-1",
          sourceType: "scenario_evidence",
          sourceId: "ev-db-connections",
          label: "Max connections",
          content: "500",
          transcriptTurnId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      selectedEvidenceIds: ["ev-1"],
      result: {
        scenarioId: "checkout-latency-spike",
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
        resilienceScore: 4,
        maxResilienceScore: 8,
        resilienceTestResults: [{ testId: "sustained-load", label: "Sustained Load", passedAtDefaultParameters: true }],
        totalScore: 14,
        maxTotalScore: 24,
      },
    }),
  );
});

test("accepts a fresh attempt with a null severity/confidence draft and no result", () => {
  assert.doesNotThrow(() =>
    PracticeScenarioAttemptViewSchema.parse({
      attemptId: "attempt-1",
      reviewSessionId: "session-1",
      practiceScenarioId: "checkout-latency-spike",
      status: "investigating",
      startedAt: "2026-01-01T00:00:00.000Z",
      submittedAt: null,
      completedAt: null,
      response: {
        diagnosis: "",
        investigationPlan: "",
        immediateAction: "",
        architectureDecision: "",
        tradeoff: "",
        severity: null,
        confidence: null,
      },
      affectedRequirementIds: [],
      evidence: [],
      selectedEvidenceIds: [],
      result: null,
    }),
  );
});
