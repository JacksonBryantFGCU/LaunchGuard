import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoAppsRoot = path.resolve(__dirname, "../../../demo-apps");

function repoInfo(name: string) {
  return { owner: "fixtures", name, url: `https://github.com/fixtures/${name}` };
}

test("scanRepository detects a healthy Node/Express/TypeScript project", async () => {
  const analysis = await scanRepository(path.join(demoAppsRoot, "healthy-node-app"), repoInfo("healthy-node-app"));

  assert.equal(analysis.project.isNodeProject, true);
  assert.ok(analysis.project.languages.includes("TypeScript"));
  assert.ok(analysis.project.frameworks.includes("Express"));
  assert.equal(analysis.manifest?.scripts.start, "node dist/server.js");
  assert.equal(analysis.manifest?.engines.node, ">=20");
  assert.ok(analysis.configuration.some((c) => c.kind === "env-example"));
  assert.ok(analysis.configuration.some((c) => c.kind === "gitignore"));
  assert.ok(analysis.configuration.some((c) => c.kind === "tsconfig"));
  assert.equal(analysis.potentialSecrets.length, 0);
  assert.equal(analysis.signals.corsWildcardFiles.length, 0);
});

test("scanRepository surfaces risky evidence: committed .env, conflicting lockfiles, wildcard CORS, secret pattern", async () => {
  const analysis = await scanRepository(path.join(demoAppsRoot, "risky-node-app"), repoInfo("risky-node-app"));

  assert.ok(analysis.configuration.some((c) => c.kind === "env-file"));
  assert.ok(!analysis.configuration.some((c) => c.kind === "env-example"));
  assert.ok(!analysis.configuration.some((c) => c.kind === "gitignore"));
  assert.ok(analysis.configuration.some((c) => c.kind === "lockfile-npm"));
  assert.ok(analysis.configuration.some((c) => c.kind === "lockfile-yarn"));
  assert.ok(analysis.signals.corsWildcardFiles.includes("src/server.js"));
  assert.ok(analysis.potentialSecrets.some((s) => s.pattern === "aws-access-key-id"));
  assert.equal(analysis.manifest?.engines.node, undefined);
});

test("scanRepository ignores node_modules and other generated directories", async () => {
  const analysis = await scanRepository(path.join(demoAppsRoot, "healthy-node-app"), repoInfo("healthy-node-app"));
  assert.ok(!analysis.files.some((f) => f.startsWith("node_modules/")));
});
