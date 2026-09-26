import { test } from "node:test";
import assert from "node:assert/strict";
import { EvaluationRubricSchema, StressTestStepSchema, StressTestSchema } from "./internalScenario.js";

test("rubric accepts weights that total 100", () => {
  assert.doesNotThrow(() =>
    EvaluationRubricSchema.parse({
      dimensions: [
        { key: "criticalRiskDetection", weight: 60, description: "x" },
        { key: "technicalReasoning", weight: 40, description: "y" },
      ],
    }),
  );
});

test("rubric rejects weights that do not total 100", () => {
  assert.throws(() =>
    EvaluationRubricSchema.parse({
      dimensions: [{ key: "criticalRiskDetection", weight: 60, description: "x" }],
    }),
  );
});

function validStep(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-1",
    sequence: 1,
    title: "Traffic surge begins",
    description: "Checkout traffic rises sharply.",
    nodeEffects: [{ nodeId: "postgres", state: "saturated", explanation: "Connection limit reached." }],
    edgeEffects: [{ edgeId: "checkout-service-postgres", state: "backlogged", explanation: "Connections queue." }],
    requirementImpacts: [{ requirementId: "req-latency", status: "violated", explanation: "p95 exceeds target." }],
    ...overrides,
  };
}

test("StressTestStepSchema accepts a fully detailed step", () => {
  assert.doesNotThrow(() => StressTestStepSchema.parse(validStep()));
});

test("StressTestStepSchema rejects an invalid node effect state", () => {
  assert.throws(() =>
    StressTestStepSchema.parse(
      validStep({ nodeEffects: [{ nodeId: "postgres", state: "on-fire", explanation: "x" }] }),
    ),
  );
});

test("StressTestStepSchema rejects an invalid edge effect state", () => {
  assert.throws(() =>
    StressTestStepSchema.parse(
      validStep({ edgeEffects: [{ edgeId: "checkout-service-postgres", state: "melting", explanation: "x" }] }),
    ),
  );
});

test("StressTestStepSchema rejects an invalid requirement impact status", () => {
  assert.throws(() =>
    StressTestStepSchema.parse(
      validStep({ requirementImpacts: [{ requirementId: "req-latency", status: "kaboom", explanation: "x" }] }),
    ),
  );
});

test("StressTestSchema requires at least one step", () => {
  assert.throws(() =>
    StressTestSchema.parse({
      id: "stress-1",
      name: "Stress",
      description: "d",
      trigger: "t",
      affectedNodes: [],
      affectedEdges: [],
      status: "pass",
      revealsRiskIds: [],
      expectedBehavior: "e",
      observedBehavior: "o",
      explanation: "x",
      steps: [],
    }),
  );
});

test("StressTestSchema accepts a step-bearing stress test", () => {
  assert.doesNotThrow(() =>
    StressTestSchema.parse({
      id: "stress-1",
      name: "Stress",
      description: "d",
      trigger: "t",
      affectedNodes: ["postgres"],
      affectedEdges: ["checkout-service-postgres"],
      status: "fail",
      revealsRiskIds: [],
      expectedBehavior: "e",
      observedBehavior: "o",
      explanation: "x",
      steps: [validStep()],
    }),
  );
});
