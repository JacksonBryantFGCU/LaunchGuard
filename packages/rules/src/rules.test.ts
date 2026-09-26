import { test } from "node:test";
import assert from "node:assert/strict";
import { baseAnalysis } from "./testFixtures.js";
import { missingEnvExample } from "./rules/missingEnvExample.js";
import { missingBuildScript } from "./rules/missingBuildScript.js";
import { missingStartScript } from "./rules/missingStartScript.js";
import { missingHealthCheck } from "./rules/missingHealthCheck.js";
import { broadCorsConfig } from "./rules/broadCorsConfig.js";
import { committedEnvFile } from "./rules/committedEnvFile.js";
import { missingGitignore } from "./rules/missingGitignore.js";
import { conflictingLockfiles } from "./rules/conflictingLockfiles.js";
import { missingNodeEngine } from "./rules/missingNodeEngine.js";
import { devScriptInStart } from "./rules/devScriptInStart.js";
import { missingTsconfig } from "./rules/missingTsconfig.js";
import { potentialSecretCommitted } from "./rules/potentialSecretCommitted.js";

function ctx(overrides: Parameters<typeof baseAnalysis>[0] = {}) {
  return { analysis: baseAnalysis(overrides) };
}

// --- missingEnvExample ---

test("missingEnvExample: irrelevant for a non-server, non-dotenv project", () => {
  assert.equal(missingEnvExample.evaluate(ctx({ project: { languages: [], frameworks: [], packageManager: "unknown", isNodeProject: true } })), null);
});

test("missingEnvExample: no finding when .env.example present for a server project", () => {
  const analysis = ctx({
    project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true },
    configuration: [{ path: ".env.example", kind: "env-example" }],
  });
  assert.equal(missingEnvExample.evaluate(analysis), null);
});

test("missingEnvExample: finding for a server project with no .env.example", () => {
  const analysis = ctx({ project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true } });
  const finding = missingEnvExample.evaluate(analysis);
  assert.ok(finding);
  assert.equal(finding?.ruleId, "missing-env-example");
});

// --- missingBuildScript ---

test("missingBuildScript: irrelevant for a plain JS Express app with no bundler", () => {
  const analysis = ctx({
    project: { languages: ["JavaScript"], frameworks: ["Express"], packageManager: "npm", isNodeProject: true },
    manifest: { scripts: {}, dependencies: {}, devDependencies: {}, engines: {} },
  });
  assert.equal(missingBuildScript.evaluate(analysis), null);
});

test("missingBuildScript: finding for a TypeScript project with no build script", () => {
  const analysis = ctx({
    project: { languages: ["TypeScript"], frameworks: [], packageManager: "npm", isNodeProject: true },
    manifest: { scripts: {}, dependencies: {}, devDependencies: { typescript: "^5.0.0" }, engines: {} },
  });
  assert.ok(missingBuildScript.evaluate(analysis));
});

test("missingBuildScript: no finding when build script exists", () => {
  const analysis = ctx({
    project: { languages: ["TypeScript"], frameworks: [], packageManager: "npm", isNodeProject: true },
    manifest: { scripts: { build: "tsc" }, dependencies: {}, devDependencies: { typescript: "^5.0.0" }, engines: {} },
  });
  assert.equal(missingBuildScript.evaluate(analysis), null);
});

// --- missingStartScript ---

test("missingStartScript: irrelevant without a server framework", () => {
  assert.equal(missingStartScript.evaluate(ctx({ project: { languages: [], frameworks: ["React"], packageManager: "npm", isNodeProject: true } })), null);
});

test("missingStartScript: finding when a server framework has no start script", () => {
  const analysis = ctx({ project: { languages: [], frameworks: ["NestJS"], packageManager: "npm", isNodeProject: true } });
  assert.ok(missingStartScript.evaluate(analysis));
});

// --- missingHealthCheck ---

test("missingHealthCheck: irrelevant for a frontend-only project", () => {
  assert.equal(missingHealthCheck.evaluate(ctx({ project: { languages: [], frameworks: ["React"], packageManager: "npm", isNodeProject: true } })), null);
});

test("missingHealthCheck: finding when a server has no health-related file", () => {
  const analysis = ctx({ project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true }, files: ["src/server.ts"] });
  assert.ok(missingHealthCheck.evaluate(analysis));
});

test("missingHealthCheck: no finding when a health-related file exists", () => {
  const analysis = ctx({ project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true }, files: ["src/routes/health.ts"] });
  assert.equal(missingHealthCheck.evaluate(analysis), null);
});

// --- broadCorsConfig ---

test("broadCorsConfig: no finding when no wildcard evidence exists", () => {
  assert.equal(broadCorsConfig.evaluate(ctx()), null);
});

test("broadCorsConfig: finding when wildcard evidence exists", () => {
  const analysis = ctx({ signals: { corsWildcardFiles: ["src/server.ts"] } });
  const finding = broadCorsConfig.evaluate(analysis);
  assert.ok(finding);
  assert.equal(finding?.severity, "high");
});

// --- committedEnvFile ---

test("committedEnvFile: no finding without a committed .env", () => {
  assert.equal(committedEnvFile.evaluate(ctx()), null);
});

test("committedEnvFile: finding when .env is committed", () => {
  const analysis = ctx({ configuration: [{ path: ".env", kind: "env-file" }] });
  assert.ok(committedEnvFile.evaluate(analysis));
});

// --- missingGitignore ---

test("missingGitignore: no finding when .gitignore present", () => {
  const analysis = ctx({ configuration: [{ path: ".gitignore", kind: "gitignore" }] });
  assert.equal(missingGitignore.evaluate(analysis), null);
});

test("missingGitignore: finding when .gitignore absent", () => {
  assert.ok(missingGitignore.evaluate(ctx()));
});

// --- conflictingLockfiles ---

test("conflictingLockfiles: no finding with a single lockfile", () => {
  const analysis = ctx({
    project: { languages: [], frameworks: [], packageManager: "npm", isNodeProject: true },
    configuration: [{ path: "package-lock.json", kind: "lockfile-npm" }],
  });
  assert.equal(conflictingLockfiles.evaluate(analysis), null);
});

test("conflictingLockfiles: finding with two lockfiles", () => {
  const analysis = ctx({
    project: { languages: [], frameworks: [], packageManager: "npm", isNodeProject: true },
    configuration: [
      { path: "package-lock.json", kind: "lockfile-npm" },
      { path: "yarn.lock", kind: "lockfile-yarn" },
    ],
  });
  assert.ok(conflictingLockfiles.evaluate(analysis));
});

// --- missingNodeEngine ---

test("missingNodeEngine: irrelevant without a server framework", () => {
  assert.equal(missingNodeEngine.evaluate(ctx()), null);
});

test("missingNodeEngine: finding for a server without engines.node", () => {
  const analysis = ctx({ project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true } });
  assert.ok(missingNodeEngine.evaluate(analysis));
});

test("missingNodeEngine: no finding when engines.node is set", () => {
  const analysis = ctx({
    project: { languages: [], frameworks: ["Express"], packageManager: "npm", isNodeProject: true },
    manifest: { scripts: {}, dependencies: {}, devDependencies: {}, engines: { node: ">=20" } },
  });
  assert.equal(missingNodeEngine.evaluate(analysis), null);
});

// --- devScriptInStart ---

test("devScriptInStart: no finding for a plain node start command", () => {
  const analysis = ctx({ manifest: { scripts: { start: "node dist/server.js" }, dependencies: {}, devDependencies: {}, engines: {} } });
  assert.equal(devScriptInStart.evaluate(analysis), null);
});

test("devScriptInStart: finding when start uses nodemon", () => {
  const analysis = ctx({ manifest: { scripts: { start: "nodemon src/server.js" }, dependencies: {}, devDependencies: {}, engines: {} } });
  assert.ok(devScriptInStart.evaluate(analysis));
});

// --- missingTsconfig ---

test("missingTsconfig: irrelevant without TypeScript files", () => {
  assert.equal(missingTsconfig.evaluate(ctx({ project: { languages: ["JavaScript"], frameworks: [], packageManager: "npm", isNodeProject: true } })), null);
});

test("missingTsconfig: finding for TypeScript project with no tsconfig", () => {
  const analysis = ctx({ project: { languages: ["TypeScript"], frameworks: [], packageManager: "npm", isNodeProject: true } });
  assert.ok(missingTsconfig.evaluate(analysis));
});

test("missingTsconfig: no finding when tsconfig.json present", () => {
  const analysis = ctx({
    project: { languages: ["TypeScript"], frameworks: [], packageManager: "npm", isNodeProject: true },
    configuration: [{ path: "tsconfig.json", kind: "tsconfig" }],
  });
  assert.equal(missingTsconfig.evaluate(analysis), null);
});

// --- potentialSecretCommitted ---

test("potentialSecretCommitted: no finding without matches", () => {
  assert.equal(potentialSecretCommitted.evaluate(ctx()), null);
});

test("potentialSecretCommitted: finding aggregates matches without exposing values", () => {
  const analysis = ctx({ potentialSecrets: [{ file: "config.json", pattern: "aws-access-key-id" }] });
  const finding = potentialSecretCommitted.evaluate(analysis);
  assert.ok(finding);
  assert.equal(finding?.evidence[0]?.file, "config.json");
  assert.ok(!JSON.stringify(finding).includes("AKIA"));
});
