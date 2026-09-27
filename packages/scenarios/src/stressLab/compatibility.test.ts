import { test } from "node:test";
import assert from "node:assert/strict";
import type { InterventionDefinition } from "@redline/shared";
import { isValidPlacement } from "./compatibility.js";

const connectionPooler: InterventionDefinition = {
  componentType: "connection-pooler",
  label: "Connection Pooler",
  category: "Performance",
  purpose: "Caps backend database connections and improves connection reuse.",
  tradeoff: { operationalComplexity: "medium", costImpact: "low", tradeoff: "May introduce request queueing under saturation." },
  validTargets: [{ edgeId: "checkout-service-postgres" }, { edgeId: "inventory-service-postgres" }],
  configFields: [],
};

test("a connection pooler may target its listed edges", () => {
  assert.equal(isValidPlacement(connectionPooler, { edgeId: "checkout-service-postgres" }), true);
});

test("a connection pooler may not target an edge it wasn't authored for", () => {
  assert.equal(isValidPlacement(connectionPooler, { edgeId: "api-gateway-checkout-service" }), false);
});

test("a node-targeted intervention rejects an edge-shaped target and vice versa", () => {
  const autoscaling: InterventionDefinition = {
    componentType: "autoscaling-policy",
    label: "Autoscaling Policy",
    category: "Scaling",
    purpose: "Increases service instance capacity within configured limits.",
    tradeoff: { operationalComplexity: "low", costImpact: "medium", tradeoff: "Does not scale downstream dependencies." },
    validTargets: [{ nodeId: "checkout-service" }, { nodeId: "inventory-service" }],
    configFields: [],
  };
  assert.equal(isValidPlacement(autoscaling, { nodeId: "checkout-service" }), true);
  assert.equal(isValidPlacement(autoscaling, { edgeId: "checkout-service-postgres" }), false);
});
