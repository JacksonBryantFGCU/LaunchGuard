import { test } from "node:test";
import assert from "node:assert/strict";
import { listScenarioPreviews, getPublicScenarioBySlug } from "./registry.js";

test("lists Black Friday Checkout in scenario previews", () => {
  const previews = listScenarioPreviews();
  assert.ok(previews.some((p) => p.slug === "black-friday-checkout"));
});

test("looks up Black Friday Checkout by slug", () => {
  const scenario = getPublicScenarioBySlug("black-friday-checkout");
  assert.ok(scenario);
  assert.equal(scenario?.title, "Black Friday Checkout Redesign");
  assert.ok(scenario!.nodes.length >= 8);
});

test("returns undefined for an unknown slug", () => {
  assert.equal(getPublicScenarioBySlug("nonexistent"), undefined);
});
