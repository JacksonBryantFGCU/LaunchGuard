import { test } from "node:test";
import assert from "node:assert/strict";
import { blackFridayCheckoutScenario as scenario } from "./scenario.js";

test("node IDs are unique", () => {
  const ids = scenario.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("edge IDs are unique", () => {
  const ids = scenario.edges.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every edge references real nodes", () => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  for (const edge of scenario.edges) {
    assert.ok(nodeIds.has(edge.source), `edge ${edge.id} has unknown source ${edge.source}`);
    assert.ok(nodeIds.has(edge.target), `edge ${edge.id} has unknown target ${edge.target}`);
  }
});

test("component details reference valid node IDs", () => {
  const nodeIds = new Set(scenario.nodes.map((n) => n.id));
  for (const details of scenario.componentDetails) {
    assert.ok(nodeIds.has(details.nodeId), `component details reference unknown node ${details.nodeId}`);
  }
});

test("connection details reference valid edge IDs", () => {
  const edgeIds = new Set(scenario.edges.map((e) => e.id));
  for (const details of scenario.connectionDetails) {
    assert.ok(edgeIds.has(details.edgeId), `connection details reference unknown edge ${details.edgeId}`);
  }
});

test("node positions are finite numbers", () => {
  for (const node of scenario.nodes) {
    assert.ok(Number.isFinite(node.position.x));
    assert.ok(Number.isFinite(node.position.y));
  }
});
