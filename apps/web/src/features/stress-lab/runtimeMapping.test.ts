import { test } from "node:test";
import assert from "node:assert/strict";
import type { SimulationFrame } from "@redline/shared";
import { mapFrameToNodeStates, mapFrameToEdgeStates, mapFrameToNodeMetrics } from "./runtimeMapping.js";

const frame: SimulationFrame = {
  timestampSeconds: 30,
  nodeStates: [{ nodeId: "postgres", state: "saturated", metrics: { Connections: "500/500" }, explanation: "full" }],
  edgeStates: [{ edgeId: "checkout-service-postgres", state: "backlogged", metrics: {}, explanation: "queued" }],
  requirementResults: [],
  systemMetrics: {},
};

test("mapFrameToNodeStates returns the frame's state keyed by nodeId for known base nodes", () => {
  const result = mapFrameToNodeStates(frame, ["postgres", "checkout-service"]);
  assert.equal(result.postgres, "saturated");
});

test("mapFrameToNodeStates falls back to null for a base node the frame has no runtime state for", () => {
  const result = mapFrameToNodeStates(frame, ["postgres", "checkout-service"]);
  assert.equal(result["checkout-service"], null);
});

test("mapFrameToNodeStates never introduces a node id absent from the base architecture", () => {
  const result = mapFrameToNodeStates(frame, ["checkout-service"]);
  assert.equal(Object.keys(result).length, 1);
  assert.equal(result["checkout-service"], null);
});

test("mapFrameToEdgeStates returns the frame's state keyed by edgeId for known base edges", () => {
  const result = mapFrameToEdgeStates(frame, ["checkout-service-postgres", "api-gateway-checkout-service"]);
  assert.equal(result["checkout-service-postgres"], "backlogged");
  assert.equal(result["api-gateway-checkout-service"], null);
});

test("mapFrameToNodeMetrics returns each known node's runtime metrics, omitting nodes the frame has none for", () => {
  const result = mapFrameToNodeMetrics(frame, ["postgres", "checkout-service"]);
  assert.deepEqual(result.postgres, { Connections: "500/500" });
  assert.equal(result["checkout-service"], undefined);
});

test("mapping does not mutate the input frame", () => {
  const before = JSON.stringify(frame);
  mapFrameToNodeStates(frame, ["postgres"]);
  mapFrameToEdgeStates(frame, ["checkout-service-postgres"]);
  assert.equal(JSON.stringify(frame), before);
});
