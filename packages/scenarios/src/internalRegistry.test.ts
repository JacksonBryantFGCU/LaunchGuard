import { test } from "node:test";
import assert from "node:assert/strict";
import { getInternalScenarioBySlug } from "./internalRegistry.js";

test("looks up the internal Black Friday Checkout scenario by slug", () => {
  const scenario = getInternalScenarioBySlug("black-friday-checkout");
  assert.ok(scenario);
  assert.ok(scenario!.hiddenRisks.length > 0);
  assert.ok(scenario!.architectContext.background.length > 0);
});

test("returns undefined for an unknown slug", () => {
  assert.equal(getInternalScenarioBySlug("nonexistent"), undefined);
});
