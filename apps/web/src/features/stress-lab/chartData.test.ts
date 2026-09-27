import { test } from "node:test";
import assert from "node:assert/strict";
import type { SimulationFrame } from "@purgatory/shared";
import type { SimulationBottleneck } from "@purgatory/shared";
import { framesToChartSeries, nearestFrameIndexForTime, flattenEvents, selectPrimaryChartKeys } from "./chartData.js";

const frames: SimulationFrame[] = [
  {
    timestampSeconds: 0,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [],
    systemMetrics: { trafficRequestsPerMinute: 800, checkoutP95Ms: 200, totalConnections: 100, availabilityPercent: 100 },
    events: [{ atSeconds: 0, type: "traffic_change", message: "Test begins." }],
  },
  {
    timestampSeconds: 30,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [],
    systemMetrics: { trafficRequestsPerMinute: 32000, checkoutP95Ms: 3400, totalConnections: 500, availabilityPercent: 60 },
    events: [],
  },
  {
    timestampSeconds: 60,
    nodeStates: [],
    edgeStates: [],
    requirementResults: [],
    systemMetrics: { trafficRequestsPerMinute: 32000, checkoutP95Ms: 3400, totalConnections: 500, availabilityPercent: 60 },
    events: [{ atSeconds: 60, type: "saturation", message: "postgres becomes saturated." }],
  },
];

test("framesToChartSeries extracts only the metrics present in the frames, one row per frame", () => {
  const series = framesToChartSeries(frames);
  assert.equal(series.length, 3);
  assert.equal(series[1]!.timestampSeconds, 30);
  assert.equal(series[1]!.checkoutP95Ms, 3400);
});

test("framesToChartSeries never invents a metric key that no frame provided", () => {
  const series = framesToChartSeries(frames);
  assert.equal("queueDepth" in series[0]!, false);
});

test("nearestFrameIndexForTime finds the closest frame to a given simulated time", () => {
  assert.equal(nearestFrameIndexForTime(frames, 28), 1);
  assert.equal(nearestFrameIndexForTime(frames, 5), 0);
  assert.equal(nearestFrameIndexForTime(frames, 55), 2);
});

test("nearestFrameIndexForTime clamps to the valid range", () => {
  assert.equal(nearestFrameIndexForTime(frames, -10), 0);
  assert.equal(nearestFrameIndexForTime(frames, 10000), 2);
});

test("selectPrimaryChartKeys puts the metric behind the worst bottleneck first", () => {
  const bottlenecks: SimulationBottleneck[] = [
    { targetType: "node", targetId: "postgres", metric: "totalConnections", observed: "500/500", threshold: "500", severity: "critical", explanation: "x" },
  ];
  const keys = selectPrimaryChartKeys(framesToChartSeries(frames), bottlenecks);
  assert.equal(keys[0], "totalConnections");
});

test("selectPrimaryChartKeys falls back to whatever metrics are actually present when there is no bottleneck", () => {
  const keys = selectPrimaryChartKeys(framesToChartSeries(frames), []);
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.ok(key in frames[0]!.systemMetrics, `${key} should be a real observed metric`);
  }
});

test("selectPrimaryChartKeys never returns more than the requested max and never duplicates a key", () => {
  const keys = selectPrimaryChartKeys(framesToChartSeries(frames), [], 2);
  assert.equal(keys.length, 2);
  assert.equal(new Set(keys).size, keys.length);
});

test("flattenEvents concatenates every frame's events in timestamp order without duplicating frames with none", () => {
  const events = flattenEvents(frames);
  assert.equal(events.length, 2);
  assert.equal(events[0]!.message, "Test begins.");
  assert.equal(events[1]!.message, "postgres becomes saturated.");
});
