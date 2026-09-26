import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadLocalEnvFiles, effectiveNodeEnv } from "./loadEnv.js";

// Uses a scratch temp directory with fixture .env/.env.local files - never
// the developer's real apps/api/.env.local - and a plain object standing in
// for process.env, so these tests can't leak or depend on real secrets.

function withFixtureDir(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), "redline-env-test-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), contents);
    }
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test(".env.local value wins over .env", () => {
  withFixtureDir({ ".env.local": "FOO=from-local\n", ".env": "FOO=from-env\n" }, (dir) => {
    const target: NodeJS.ProcessEnv = {};
    loadLocalEnvFiles(dir, "development", target);
    assert.equal(target.FOO, "from-local");
  });
});

test("an already-set process env value is never overridden by file values", () => {
  withFixtureDir({ ".env.local": "FOO=from-local\n" }, (dir) => {
    const target: NodeJS.ProcessEnv = { FOO: "from-shell" };
    loadLocalEnvFiles(dir, "development", target);
    assert.equal(target.FOO, "from-shell");
  });
});

test(".env is used as a fallback for keys .env.local does not define", () => {
  withFixtureDir({ ".env.local": "FOO=from-local\n", ".env": "FOO=from-env\nBAR=from-env\n" }, (dir) => {
    const target: NodeJS.ProcessEnv = {};
    loadLocalEnvFiles(dir, "development", target);
    assert.equal(target.FOO, "from-local");
    assert.equal(target.BAR, "from-env");
  });
});

test("does not load any local env files in production", () => {
  withFixtureDir({ ".env.local": "FOO=from-local\n", ".env": "FOO=from-env\n" }, (dir) => {
    const target: NodeJS.ProcessEnv = {};
    loadLocalEnvFiles(dir, "production", target);
    assert.equal(target.FOO, undefined);
  });
});

test("does not load any local env files under a test run (npm_lifecycle_event=test)", () => {
  withFixtureDir({ ".env.local": "FOO=from-local\n" }, (dir) => {
    const target: NodeJS.ProcessEnv = {};
    loadLocalEnvFiles(dir, "test", target);
    assert.equal(target.FOO, undefined);
  });
});

test("does not throw when neither file exists", () => {
  withFixtureDir({}, (dir) => {
    const target: NodeJS.ProcessEnv = {};
    assert.doesNotThrow(() => loadLocalEnvFiles(dir, "development", target));
  });
});

test("effectiveNodeEnv prefers an explicit NODE_ENV", () => {
  assert.equal(effectiveNodeEnv({ NODE_ENV: "production", npm_lifecycle_event: "test" }), "production");
});

test("effectiveNodeEnv treats a pnpm/npm test run as \"test\" even without NODE_ENV set", () => {
  assert.equal(effectiveNodeEnv({ npm_lifecycle_event: "test" }), "test");
});

test("effectiveNodeEnv defaults to \"development\" otherwise", () => {
  assert.equal(effectiveNodeEnv({}), "development");
});
