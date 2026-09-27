import { test } from "node:test";
import assert from "node:assert/strict";
import { getInternalScenarioBySlug, getStressLabDefinition, runStressLabSimulation } from "./internalRegistry.js";

test("looks up the internal Black Friday Checkout scenario by slug", () => {
  const scenario = getInternalScenarioBySlug("black-friday-checkout");
  assert.ok(scenario);
  assert.ok(scenario!.hiddenRisks.length > 0);
  assert.ok(scenario!.architectContext.background.length > 0);
});

test("returns undefined for an unknown slug", () => {
  assert.equal(getInternalScenarioBySlug("nonexistent"), undefined);
});

// --- practice scenario -> Stress Lab resolution ---

test("getStressLabDefinition resolves checkout-latency-spike to its two mapped tests, not every Black Friday test", () => {
  const lab = getStressLabDefinition("checkout-latency-spike");
  assert.ok(lab);
  assert.deepEqual(
    lab!.testDefinitions.map((t) => t.id).sort(),
    ["payment-provider-degradation", "sustained-load"],
  );
});

test("getStressLabDefinition resolves payment-provider-degradation correctly", () => {
  const lab = getStressLabDefinition("payment-provider-degradation");
  assert.deepEqual(
    lab!.testDefinitions.map((t) => t.id).sort(),
    ["payment-provider-degradation", "sustained-load"],
  );
});

test("getStressLabDefinition resolves black-friday-capacity-surge to its three mapped tests", () => {
  const lab = getStressLabDefinition("black-friday-capacity-surge");
  assert.deepEqual(
    lab!.testDefinitions.map((t) => t.id).sort(),
    ["database-saturation", "sustained-load", "traffic-spike"],
  );
});

test("getStressLabDefinition resolves regional-database-failure to exactly one test", () => {
  const lab = getStressLabDefinition("regional-database-failure");
  assert.deepEqual(lab!.testDefinitions.map((t) => t.id), ["regional-database-failure"]);
});

test("getStressLabDefinition returns a defined-but-empty result for the intentionally unsupported duplicate-checkout-requests scenario (distinct from a missing scenario)", () => {
  const lab = getStressLabDefinition("duplicate-checkout-requests");
  assert.ok(lab, "expected a defined lab (scenario exists), just with zero test definitions");
  assert.deepEqual(lab!.testDefinitions, []);
});

test("getStressLabDefinition returns undefined for a practice scenario that doesn't exist at all", () => {
  assert.equal(getStressLabDefinition("not-a-real-scenario"), undefined);
});

test("runStressLabSimulation refuses to run a test id not linked to the given scenario, even if it's a valid test elsewhere", () => {
  const result = runStressLabSimulation("regional-database-failure", "traffic-spike", {}, []);
  assert.equal(result, undefined);
});

test("runStressLabSimulation runs a linked test id successfully", () => {
  const result = runStressLabSimulation("checkout-latency-spike", "sustained-load", {}, []);
  assert.ok(result);
  assert.equal(result!.testId, "sustained-load");
});
