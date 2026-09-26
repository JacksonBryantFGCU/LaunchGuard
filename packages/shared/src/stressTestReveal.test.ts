import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NodeEffectSchema,
  EdgeEffectSchema,
  RequirementImpactSchema,
  StressTestStepRevealSchema,
  StressTestRevealSchema,
  StressTestRevealListSchema,
} from "./stressTestReveal.js";

function validNodeEffect(overrides: Record<string, unknown> = {}) {
  return {
    nodeId: "postgres",
    state: "saturated",
    metricLabel: "Active connections",
    metricValue: "500/500",
    explanation: "Both services scaled out against a fixed connection limit.",
    ...overrides,
  };
}

function validEdgeEffect(overrides: Record<string, unknown> = {}) {
  return {
    edgeId: "checkout-service-postgres",
    state: "backlogged",
    explanation: "New connections queue behind the exhausted pool.",
    ...overrides,
  };
}

function validRequirementImpact(overrides: Record<string, unknown> = {}) {
  return {
    requirementId: "req-latency",
    status: "violated",
    observedValue: "p95 8.4s",
    explanation: "Requests queue behind the exhausted connection pool.",
    ...overrides,
  };
}

function validStep(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-1",
    sequence: 1,
    title: "Traffic surge begins",
    description: "Checkout traffic rises sharply.",
    nodeEffects: [validNodeEffect()],
    edgeEffects: [validEdgeEffect()],
    requirementImpacts: [validRequirementImpact()],
    ...overrides,
  };
}

function validReveal(overrides: Record<string, unknown> = {}) {
  return {
    id: "stress-10x-spike",
    name: "10x traffic spike",
    description: "A sudden spike to the projected flash-sale rate.",
    trigger: "Traffic rises from 800 to 32,000 requests/minute over two minutes.",
    status: "fail",
    steps: [validStep()],
    expectedBehavior: "Services scale out and checkout throughput keeps pace with demand.",
    observedBehavior: "Postgres connection count approaches its configured limit.",
    explanation: "Horizontal scaling was never reconciled against the connection limit.",
    ...overrides,
  };
}

test("NodeEffectSchema accepts a valid finite state", () => {
  assert.doesNotThrow(() => NodeEffectSchema.parse(validNodeEffect()));
});

test("NodeEffectSchema rejects an invalid state", () => {
  assert.throws(() => NodeEffectSchema.parse(validNodeEffect({ state: "on-fire" })));
});

test("EdgeEffectSchema accepts a valid finite state", () => {
  assert.doesNotThrow(() => EdgeEffectSchema.parse(validEdgeEffect()));
});

test("EdgeEffectSchema rejects an invalid state", () => {
  assert.throws(() => EdgeEffectSchema.parse(validEdgeEffect({ state: "melting" })));
});

test("RequirementImpactSchema accepts a valid status", () => {
  assert.doesNotThrow(() => RequirementImpactSchema.parse(validRequirementImpact()));
});

test("RequirementImpactSchema rejects an invalid status", () => {
  assert.throws(() => RequirementImpactSchema.parse(validRequirementImpact({ status: "definitely_broken" })));
});

test("StressTestStepRevealSchema accepts a fully-formed step", () => {
  assert.doesNotThrow(() => StressTestStepRevealSchema.parse(validStep()));
});

test("StressTestRevealSchema accepts a fully-formed reveal", () => {
  assert.doesNotThrow(() => StressTestRevealSchema.parse(validReveal()));
});

test("StressTestRevealSchema strips private fields like revealsRiskIds", () => {
  const parsed = StressTestRevealSchema.parse(
    validReveal({ revealsRiskIds: ["risk-db-connection-exhaustion"], expectedReviewerInsight: "secret" }),
  ) as Record<string, unknown>;
  assert.equal(parsed.revealsRiskIds, undefined);
  assert.equal(parsed.expectedReviewerInsight, undefined);
});

test("StressTestRevealListSchema accepts a reviewId/scenarioSlug/tests envelope", () => {
  assert.doesNotThrow(() =>
    StressTestRevealListSchema.parse({
      reviewId: "review-1",
      scenarioSlug: "black-friday-checkout",
      tests: [validReveal()],
    }),
  );
});
