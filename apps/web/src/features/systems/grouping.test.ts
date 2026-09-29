import { test } from "node:test";
import assert from "node:assert/strict";
import type { SystemSummary } from "@purgatory/shared";
import { groupSystems, sourceLabel, isSystemEmpty, workspaceTabs } from "./grouping.js";

function system(overrides: Partial<SystemSummary>): SystemSummary {
  return {
    id: "id",
    slug: "slug",
    name: "Name",
    sourceType: "manual",
    visibility: "private",
    ownerUserId: "user_1",
    componentCount: 0,
    scenarioCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("groupSystems separates samples from owned systems", () => {
  const sample = system({ sourceType: "sample", visibility: "public", ownerUserId: null });
  const owned = system({ sourceType: "manual" });
  const { samples, owned: ownedList } = groupSystems([sample, owned]);
  assert.deepEqual(samples, [sample]);
  assert.deepEqual(ownedList, [owned]);
});

test("sourceLabel labels sample and manual systems", () => {
  assert.equal(sourceLabel("sample"), "Sample");
  assert.equal(sourceLabel("manual"), "Private");
});

test("isSystemEmpty is true only when there is no architecture or scenarios", () => {
  assert.equal(isSystemEmpty(system({ componentCount: 0, scenarioCount: 0 })), true);
  assert.equal(isSystemEmpty(system({ componentCount: 3, scenarioCount: 0 })), false);
  assert.equal(isSystemEmpty(system({ componentCount: 0, scenarioCount: 2 })), false);
});

test("workspaceTabs lists the six workspace sections in order", () => {
  assert.deepEqual(workspaceTabs, ["overview", "architecture", "requirements", "scenarios", "simulations", "findings"]);
});
