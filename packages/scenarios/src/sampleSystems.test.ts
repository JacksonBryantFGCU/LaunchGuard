import { test } from "node:test";
import assert from "node:assert/strict";
import { listSampleSystems, getSampleSystemBySlug } from "./sampleSystems.js";

test("lists Black Friday Checkout as a sample system", () => {
  const systems = listSampleSystems();
  const blackFriday = systems.find((s) => s.slug === "black-friday-checkout");
  assert.ok(blackFriday);
  assert.equal(blackFriday.sourceType, "sample");
  assert.equal(blackFriday.visibility, "public");
  assert.equal(blackFriday.ownerUserId, null);
  assert.equal(blackFriday.componentCount, 10);
  assert.equal(blackFriday.scenarioCount, 5);
});

test("looks up the Black Friday sample system by slug", () => {
  const system = getSampleSystemBySlug("black-friday-checkout");
  assert.ok(system);
  assert.equal(system.name, "Black Friday Checkout Redesign");
});

test("returns undefined for an unknown sample system slug", () => {
  assert.equal(getSampleSystemBySlug("not-real"), undefined);
});
