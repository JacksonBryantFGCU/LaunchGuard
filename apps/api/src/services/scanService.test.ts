import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepository, scanRepositoryUrl } from "./scanService.js";
import { RepositoryScanError } from "../errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoAppsRoot = path.resolve(__dirname, "../../../../demo-apps");

test("analyzeRepository runs the full scan->rules->report pipeline against a local fixture, no network", async () => {
  const result = await analyzeRepository(path.join(demoAppsRoot, "risky-node-app"), {
    owner: "fixtures",
    name: "risky-node-app",
    url: "https://github.com/fixtures/risky-node-app",
  });

  assert.equal(result.repository.name, "risky-node-app");
  assert.ok(result.summary.totalFindings > 0);
  const ruleIds = result.findings.map((f) => f.ruleId);
  assert.ok(ruleIds.includes("committed-env-file"));
  assert.ok(ruleIds.includes("missing-gitignore"));
});

test("scanRepositoryUrl cleans up the temp clone on a successful scan", async () => {
  let cleanedUp = false;
  const result = await scanRepositoryUrl("https://github.com/fixtures/healthy-node-app", {
    clone: async () => ({
      root: path.join(demoAppsRoot, "healthy-node-app"),
      cleanup: async () => {
        cleanedUp = true;
      },
    }),
  });

  assert.equal(result.repository.name, "healthy-node-app");
  assert.equal(cleanedUp, true);
});

test("scanRepositoryUrl cleans up the temp clone even when analysis fails", async () => {
  let cleanedUp = false;

  await assert.rejects(
    scanRepositoryUrl("https://github.com/fixtures/does-not-exist", {
      clone: async () => ({
        root: path.join(demoAppsRoot, "this-directory-does-not-exist"),
        cleanup: async () => {
          cleanedUp = true;
        },
      }),
    }),
    RepositoryScanError,
  );

  assert.equal(cleanedUp, true);
});

test("scanRepositoryUrl rejects an invalid repository URL before attempting to clone", async () => {
  let cloneCalled = false;
  await assert.rejects(
    scanRepositoryUrl("https://gitlab.com/owner/repo", {
      clone: async () => {
        cloneCalled = true;
        throw new Error("should not be called");
      },
    }),
    RepositoryScanError,
  );
  assert.equal(cloneCalled, false);
});
