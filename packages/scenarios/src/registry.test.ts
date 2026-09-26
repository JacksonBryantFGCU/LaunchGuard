import { test } from "node:test";
import assert from "node:assert/strict";
import { listScenarioPreviews, getPublicScenarioBySlug } from "./registry.js";

test("lists Payment Retry in scenario previews", () => {
  const previews = listScenarioPreviews();
  assert.ok(previews.some((p) => p.slug === "payment-retry"));
});

test("looks up Payment Retry by slug", () => {
  const scenario = getPublicScenarioBySlug("payment-retry");
  assert.ok(scenario);
  assert.equal(scenario?.title, "Payment Retry");
  assert.equal(scenario?.files.length, 3);
});

test("returns undefined for an unknown slug", () => {
  assert.equal(getPublicScenarioBySlug("nonexistent"), undefined);
});
