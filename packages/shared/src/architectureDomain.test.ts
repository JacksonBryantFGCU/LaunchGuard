import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ArchitectureNodeSchema,
  ArchitectureEdgeSchema,
  ArchitectureRequirementSchema,
  PublicArchitectureScenarioSchema,
  RedlineSchema,
} from "./architectureDomain.js";

function validNode() {
  return {
    id: "checkout-service",
    category: "service",
    label: "Checkout Service",
    position: { x: 0, y: 0 },
    summary: "Orchestrates checkout.",
  };
}

function validEdge() {
  return {
    id: "checkout-service-to-payment-provider",
    source: "checkout-service",
    target: "payment-provider",
    label: "HTTPS",
    protocol: "HTTPS",
    mode: "synchronous",
  };
}

test("accepts a valid architecture node", () => {
  assert.doesNotThrow(() => ArchitectureNodeSchema.parse(validNode()));
});

test("rejects an invalid node category", () => {
  assert.throws(() => ArchitectureNodeSchema.parse({ ...validNode(), category: "spaceship" }));
});

test("rejects a node with a non-finite position", () => {
  assert.throws(() => ArchitectureNodeSchema.parse({ ...validNode(), position: { x: Infinity, y: 0 } }));
});

test("accepts a valid architecture edge", () => {
  assert.doesNotThrow(() => ArchitectureEdgeSchema.parse(validEdge()));
});

test("rejects an edge with an invalid connection mode", () => {
  assert.throws(() => ArchitectureEdgeSchema.parse({ ...validEdge(), mode: "telepathic" }));
});

test("rejects a requirement with an invalid area", () => {
  assert.throws(() =>
    ArchitectureRequirementSchema.parse({ id: "r1", area: "vibes", summary: "Must feel fast." }),
  );
});

test("validates a minimal complete public architecture scenario", () => {
  const scenario = {
    id: "black-friday-checkout",
    slug: "black-friday-checkout",
    title: "Black Friday Checkout Redesign",
    reviewCode: "AR-204",
    description: "Review the proposed checkout architecture.",
    difficulty: "senior",
    focusAreas: ["reliability", "scalability"],
    status: "Review Requested",
    architect: { name: "Alex Chen", role: "Senior Software Engineer" },
    reviewerRole: "You are the senior engineer deciding whether this architecture is ready.",
    learningObjective: "Review the checkout architecture for production risk.",
    instructions: ["Review the requirements.", "Inspect each component."],
    expectedDeliverables: ["Architecture redlines", "Reviewer notes"],
    requirements: [{ id: "req-1", area: "functional", summary: "Create checkout." }],
    constraints: [{ id: "con-1", summary: "Black Friday launch deadline." }],
    evidence: [{ id: "ev-1", category: "Traffic", label: "Peak", value: "15,000 requests/minute" }],
    nodes: [validNode()],
    edges: [],
    componentDetails: [{ nodeId: "checkout-service", responsibilities: ["orchestration"], dependencies: [], dataOwned: [] }],
    connectionDetails: [],
  };
  assert.doesNotThrow(() => PublicArchitectureScenarioSchema.parse(scenario));
});

function validRedline() {
  return {
    id: "redline-1",
    targetType: "edge",
    targetId: "checkout-service-payment-provider",
    category: "reliability",
    severity: "high",
    title: "Missing external timeout",
    reasoning: "A provider degradation could hold checkout requests open indefinitely.",
    createdAt: new Date().toISOString(),
  };
}

test("accepts a valid redline", () => {
  assert.doesNotThrow(() => RedlineSchema.parse(validRedline()));
});

test("rejects a redline with an invalid category", () => {
  assert.throws(() => RedlineSchema.parse({ ...validRedline(), category: "vibes" }));
});

test("rejects a redline with an invalid severity", () => {
  assert.throws(() => RedlineSchema.parse({ ...validRedline(), severity: "urgent" }));
});

test("rejects a redline with an empty title", () => {
  assert.throws(() => RedlineSchema.parse({ ...validRedline(), title: "" }));
});

test("rejects a redline with a too-short reasoning", () => {
  assert.throws(() => RedlineSchema.parse({ ...validRedline(), reasoning: "no" }));
});
