import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRedlineDraft, type RedlineFormInput } from "./redlineValidation.js";

function validNodeInput(): RedlineFormInput {
  return {
    targetType: "node",
    targetId: "postgres",
    category: "resilience",
    severity: "critical",
    title: "Single-region deployment",
    reasoning: "This does not satisfy the stated recovery objectives during a regional failure.",
  };
}

function validEdgeInput(): RedlineFormInput {
  return {
    targetType: "edge",
    targetId: "checkout-service-payment-provider",
    category: "reliability",
    severity: "high",
    title: "Missing timeout",
    reasoning: "A slow provider response can hold checkout capacity open indefinitely.",
  };
}

test("accepts a valid node redline", () => {
  const result = validateRedlineDraft(validNodeInput());
  assert.equal(result.ok, true);
});

test("accepts a valid edge redline", () => {
  const result = validateRedlineDraft(validEdgeInput());
  assert.equal(result.ok, true);
});

test("rejects an invalid category", () => {
  const result = validateRedlineDraft({ ...validEdgeInput(), category: "vibes" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.category);
});

test("rejects an invalid severity", () => {
  const result = validateRedlineDraft({ ...validEdgeInput(), severity: "urgent" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.severity);
});

test("rejects an empty title", () => {
  const result = validateRedlineDraft({ ...validEdgeInput(), title: "   " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.title);
});

test("rejects an empty reasoning", () => {
  const result = validateRedlineDraft({ ...validEdgeInput(), reasoning: "" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.reasoning);
});

test("rejects a missing target id", () => {
  const result = validateRedlineDraft({ ...validEdgeInput(), targetId: "" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.targetId);
});
