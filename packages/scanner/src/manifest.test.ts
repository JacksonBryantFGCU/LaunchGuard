import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { inventoryRepository } from "./inventory.js";
import { inspectPackageManifest } from "./manifest.js";

test("inspectPackageManifest reports a warning and no crash for malformed JSON", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "launchguard-manifest-test-"));
  try {
    await writeFile(path.join(root, "package.json"), "{ not valid json");
    const warnings: { code: string; message: string }[] = [];
    const inventory = await inventoryRepository(root, warnings);
    const manifest = await inspectPackageManifest(root, inventory, warnings);

    assert.equal(manifest?.parseError, "invalid-json");
    assert.ok(warnings.some((w) => w.code === "manifest-malformed"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inspectPackageManifest returns undefined when there is no package.json", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "launchguard-manifest-test-"));
  try {
    const warnings: { code: string; message: string }[] = [];
    const inventory = await inventoryRepository(root, warnings);
    const manifest = await inspectPackageManifest(root, inventory, warnings);
    assert.equal(manifest, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
