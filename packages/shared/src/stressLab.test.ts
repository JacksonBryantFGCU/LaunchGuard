import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveActiveComponents,
  StressProfileSchema,
  SimulationFrameSchema,
  StressTestTimelineResultSchema,
  StressSimulationRunRecordSchema,
  SimulationNodeStateSchema,
  SimulationBottleneckSchema,
  InterventionConfigFieldSchema,
  type ArchitectureModification,
} from "./stressLab.js";

test("resolveActiveComponents keeps only standing add-component modifications", () => {
  const mods: ArchitectureModification[] = [
    { kind: "add-component", id: "m1", componentType: "cache", config: {} },
    { kind: "add-component", id: "m2", componentType: "connection-pooler", config: { maxBackendConnections: 300 } },
    { kind: "remove-component", modificationId: "m1" },
  ];
  const active = resolveActiveComponents(mods);
  assert.deepEqual(active.map((m) => m.id), ["m2"]);
});

test("resolveActiveComponents merges configure-component onto its target", () => {
  const mods: ArchitectureModification[] = [
    { kind: "add-component", id: "m1", componentType: "connection-pooler", config: { maxBackendConnections: 300 } },
    { kind: "configure-component", modificationId: "m1", config: { maxBackendConnections: 400 } },
  ];
  const active = resolveActiveComponents(mods);
  assert.equal(active.length, 1);
  assert.equal(active[0]!.config.maxBackendConnections, 400);
});

test("resolveActiveComponents with no modifications returns baseline (empty)", () => {
  assert.deepEqual(resolveActiveComponents([]), []);
});

test("StressProfileSchema requires a category, duration, and step to define a timeline", () => {
  const parsed = StressProfileSchema.parse({
    id: "sustained-load",
    scenarioId: "black-friday-capacity-surge",
    label: "Sustained Load",
    description: "Steady-state capacity at a fixed traffic level.",
    category: "load",
    durationSeconds: 300,
    stepSeconds: 30,
    parameters: [
      { id: "requestsPerMinute", label: "Traffic", description: "Checkout requests per minute.", type: "number", defaultValue: 15000, editable: true },
    ],
  });
  assert.equal(parsed.category, "load");
  assert.equal(parsed.durationSeconds, 300);
});

test("StressProfileSchema rejects an unknown category", () => {
  assert.throws(() =>
    StressProfileSchema.parse({
      id: "x",
      scenarioId: "s",
      label: "x",
      description: "x",
      category: "not-a-real-category",
      durationSeconds: 60,
      stepSeconds: 10,
      parameters: [{ id: "p", label: "p", description: "p", type: "number", defaultValue: 1, editable: true }],
    }),
  );
});

test("SimulationFrameSchema parses a single timestamped snapshot", () => {
  const frame = SimulationFrameSchema.parse({
    timestampSeconds: 30,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [{ requirementId: "req-throughput", status: "met", explanation: "Within capacity." }],
    systemMetrics: { checkoutP95Ms: 400 },
  });
  assert.equal(frame.timestampSeconds, 30);
});

test("StressTestTimelineResultSchema parses a full run with frames and an aggregate pass/fail", () => {
  const result = StressTestTimelineResultSchema.parse({
    testId: "sustained-load",
    parameters: { requestsPerMinute: 15000 },
    frames: [
      {
        timestampSeconds: 0,
        nodeStates: [],
        edgeStates: [],
        requirementResults: [{ requirementId: "req-throughput", status: "met", explanation: "ok" }],
        systemMetrics: {},
      },
    ],
    finalMetrics: { checkoutP95Ms: 400 },
    bottlenecks: [],
    requirementResults: [{ requirementId: "req-throughput", status: "met", explanation: "ok" }],
    passed: true,
    summary: "All requirements held throughout the run.",
  });
  assert.equal(result.passed, true);
  assert.equal(result.frames.length, 1);
});

test("StressSimulationRunRecordSchema parses a persisted run record", () => {
  const record = StressSimulationRunRecordSchema.parse({
    id: "run-1",
    attemptId: "attempt-1",
    testId: "database-saturation",
    runNumber: 2,
    parameters: { requestsPerMinute: 32000 },
    modifications: [],
    passed: false,
    finalMetrics: { checkoutP95Ms: 2738 },
    requirementResults: [{ requirementId: "req-throughput", status: "violated", explanation: "x" }],
    bottlenecks: [],
    summary: "1 requirement(s) were violated during the run.",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(record.runNumber, 2);
});

test("SimulationNodeStateSchema accepts structured numeric metrics alongside display metrics", () => {
  const state = SimulationNodeStateSchema.parse({
    nodeId: "postgres",
    state: "saturated",
    metrics: { Connections: "500/500" },
    numericMetrics: { connectionsUsed: 500, maxConnections: 500, utilizationPercent: 100 },
    explanation: "full",
  });
  assert.equal(state.numericMetrics.utilizationPercent, 100);
});

test("SimulationNodeStateSchema defaults numericMetrics to empty when omitted (backward compatible)", () => {
  const state = SimulationNodeStateSchema.parse({ nodeId: "postgres", state: "normal", explanation: "ok" });
  assert.deepEqual(state.numericMetrics, {});
});

test("SimulationFrameSchema defaults events to an empty array when omitted", () => {
  const frame = SimulationFrameSchema.parse({
    timestampSeconds: 0,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [],
    systemMetrics: {},
  });
  assert.deepEqual(frame.events, []);
});

test("SimulationFrameSchema accepts a meaningful event", () => {
  const frame = SimulationFrameSchema.parse({
    timestampSeconds: 30,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [],
    systemMetrics: {},
    events: [{ atSeconds: 30, type: "saturation", message: "PostgreSQL connections exceed 90%." }],
  });
  assert.equal(frame.events[0]!.type, "saturation");
});

test("SimulationBottleneckSchema accepts a causal chain and defaults it to empty", () => {
  const withChain = SimulationBottleneckSchema.parse({
    targetType: "node",
    targetId: "postgres",
    metric: "Connections",
    observed: "500/500",
    threshold: "500",
    severity: "critical",
    explanation: "full",
    causalChain: ["Payment Provider latency", "Checkout in-flight requests", "Checkout utilization"],
  });
  assert.equal(withChain.causalChain.length, 3);

  const withoutChain = SimulationBottleneckSchema.parse({
    targetType: "node",
    targetId: "postgres",
    metric: "Connections",
    observed: "500/500",
    threshold: "500",
    severity: "critical",
    explanation: "full",
  });
  assert.deepEqual(withoutChain.causalChain, []);
});

test("InterventionConfigFieldSchema accepts labeled numeric options for an enum-like config (e.g. retry backoff)", () => {
  const field = InterventionConfigFieldSchema.parse({
    key: "backoff",
    label: "Backoff strategy",
    defaultValue: 1,
    options: [
      { label: "None", value: 0 },
      { label: "Fixed", value: 1 },
      { label: "Exponential", value: 2 },
    ],
  });
  assert.equal(field.options?.length, 3);
});
