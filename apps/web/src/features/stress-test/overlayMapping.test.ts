import { test } from "node:test";
import assert from "node:assert/strict";
import type { StressTestStepReveal } from "@purgatory/shared";
import { computeStressOverlay } from "./overlayMapping.js";

function step(overrides: Partial<StressTestStepReveal> = {}): StressTestStepReveal {
  return {
    id: "step-1",
    sequence: 1,
    title: "Title",
    description: "Description",
    nodeEffects: [],
    edgeEffects: [],
    requirementImpacts: [],
    ...overrides,
  };
}

test("returns null for every node/edge id not mentioned by the step", () => {
  const overlay = computeStressOverlay(step(), ["checkout-service", "postgres"], ["checkout-service-postgres"]);
  assert.equal(overlay.nodeStates["checkout-service"], null);
  assert.equal(overlay.nodeStates["postgres"], null);
  assert.equal(overlay.edgeStates["checkout-service-postgres"], null);
});

test("affected node gets its authored state", () => {
  const overlay = computeStressOverlay(
    step({ nodeEffects: [{ nodeId: "postgres", state: "saturated", explanation: "x" }] }),
    ["checkout-service", "postgres"],
    [],
  );
  assert.equal(overlay.nodeStates.postgres, "saturated");
  assert.equal(overlay.nodeStates["checkout-service"], null);
});

test("affected edge gets its authored state", () => {
  const overlay = computeStressOverlay(
    step({ edgeEffects: [{ edgeId: "checkout-service-postgres", state: "backlogged", explanation: "x" }] }),
    [],
    ["checkout-service-postgres"],
  );
  assert.equal(overlay.edgeStates["checkout-service-postgres"], "backlogged");
});

test("null current step yields normal (no override) state for everything", () => {
  const overlay = computeStressOverlay(null, ["checkout-service"], ["checkout-service-postgres"]);
  assert.equal(overlay.nodeStates["checkout-service"], null);
  assert.equal(overlay.edgeStates["checkout-service-postgres"], null);
});

test("a later step's effects fully replace an earlier step's for the same object", () => {
  const earlier = computeStressOverlay(
    step({ nodeEffects: [{ nodeId: "postgres", state: "degraded", explanation: "x" }] }),
    ["postgres"],
    [],
  );
  const later = computeStressOverlay(
    step({ nodeEffects: [{ nodeId: "postgres", state: "unavailable", explanation: "y" }] }),
    ["postgres"],
    [],
  );
  assert.equal(earlier.nodeStates.postgres, "degraded");
  assert.equal(later.nodeStates.postgres, "unavailable");
});
