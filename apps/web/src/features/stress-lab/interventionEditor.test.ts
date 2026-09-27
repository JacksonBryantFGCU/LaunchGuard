import { test } from "node:test";
import assert from "node:assert/strict";
import type { InterventionDefinition } from "@redline/shared";
import { isValidPlacement, addIntervention, removeIntervention, configureIntervention } from "./interventionEditor.js";

const pooler: InterventionDefinition = {
  componentType: "connection-pooler",
  label: "Connection Pooler",
  category: "Performance",
  purpose: "Caps backend database connections.",
  tradeoff: { operationalComplexity: "medium", costImpact: "low", tradeoff: "May introduce queueing." },
  validTargets: [{ edgeId: "checkout-service-postgres" }],
  configFields: [{ key: "maxBackendConnections", label: "Max backend connections", defaultValue: 150, min: 20, max: 400, step: 10 }],
};

test("isValidPlacement accepts a listed target and rejects an unlisted one", () => {
  assert.equal(isValidPlacement(pooler, { edgeId: "checkout-service-postgres" }), true);
  assert.equal(isValidPlacement(pooler, { edgeId: "api-gateway-checkout-service" }), false);
});

test("addIntervention adds an add-component modification seeded with config defaults", () => {
  const result = addIntervention([], pooler, { edgeId: "checkout-service-postgres" });
  assert.equal(result.error, undefined);
  assert.equal(result.modifications.length, 1);
  const mod = result.modifications[0]!;
  assert.equal(mod.componentType, "connection-pooler");
  assert.equal(mod.config.maxBackendConnections, 150);
});

test("addIntervention rejects an invalid target and adds nothing", () => {
  const result = addIntervention([], pooler, { edgeId: "not-a-real-edge" });
  assert.ok(result.error);
  assert.equal(result.modifications.length, 0);
});

test("addIntervention preserves previously added interventions", () => {
  const first = addIntervention([], pooler, { edgeId: "checkout-service-postgres" }).modifications;
  const second = addIntervention(first, pooler, { edgeId: "checkout-service-postgres" }).modifications;
  assert.equal(second.length, 2);
});

test("removeIntervention removes exactly the named modification", () => {
  const added = addIntervention([], pooler, { edgeId: "checkout-service-postgres" }).modifications;
  const id = added[0]!.id;
  const withOther = addIntervention(added, pooler, { edgeId: "checkout-service-postgres" }).modifications;
  const after = removeIntervention(withOther, id);
  assert.equal(after.length, 1);
  assert.notEqual(after[0]!.id, id);
});

test("configureIntervention updates only the target modification's config, leaving others untouched", () => {
  const added = addIntervention([], pooler, { edgeId: "checkout-service-postgres" }).modifications;
  const withOther = addIntervention(added, pooler, { edgeId: "checkout-service-postgres" }).modifications;
  const id = withOther[0]!.id;
  const after = configureIntervention(withOther, id, { maxBackendConnections: 300 });
  assert.equal(after.length, 2);
  assert.equal(after.find((m) => m.id === id)?.config.maxBackendConnections, 300);
  assert.equal(after.find((m) => m.id !== id)?.config.maxBackendConnections, 150);
});
