import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { inventoryRepository } from "./inventory.js";

test("inventoryRepository skips ignored directories like node_modules and .git", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "launchguard-inventory-test-"));
  try {
    await mkdir(path.join(root, "node_modules", "some-pkg"), { recursive: true });
    await writeFile(path.join(root, "node_modules", "some-pkg", "index.js"), "module.exports = {}");
    await writeFile(path.join(root, "kept.txt"), "hello");

    const warnings: { code: string; message: string }[] = [];
    const inventory = await inventoryRepository(root, warnings);

    assert.deepEqual(inventory.files.map((f) => f.relativePath), ["kept.txt"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
