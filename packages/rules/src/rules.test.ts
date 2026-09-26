import { test } from "node:test";
import assert from "node:assert/strict";
import type { RuleContext } from "@launchguard/shared";
import { missingEnvExample } from "./rules/missingEnvExample.js";
import { missingBuildScript } from "./rules/missingBuildScript.js";
import { missingStartScript } from "./rules/missingStartScript.js";
import { missingHealthCheck } from "./rules/missingHealthCheck.js";
import { broadCorsConfig } from "./rules/broadCorsConfig.js";

function goodContext(): RuleContext {
  return {
    project: {
      name: "sample",
      hasEnvExample: true,
      hasBuildScript: true,
      hasStartScript: true,
      hasHealthCheck: true,
      corsOrigins: ["https://example.com"],
    },
  };
}

test("missingEnvExample: no finding when .env.example present", () => {
  assert.equal(missingEnvExample.evaluate(goodContext()), null);
});

test("missingEnvExample: finding when .env.example absent", () => {
  const ctx = goodContext();
  ctx.project.hasEnvExample = false;
  const finding = missingEnvExample.evaluate(ctx);
  assert.ok(finding);
  assert.equal(finding?.ruleId, "missing-env-example");
});

test("missingBuildScript: no finding when build script present", () => {
  assert.equal(missingBuildScript.evaluate(goodContext()), null);
});

test("missingBuildScript: finding when build script absent", () => {
  const ctx = goodContext();
  ctx.project.hasBuildScript = false;
  assert.ok(missingBuildScript.evaluate(ctx));
});

test("missingStartScript: no finding when start script present", () => {
  assert.equal(missingStartScript.evaluate(goodContext()), null);
});

test("missingStartScript: finding when start script absent", () => {
  const ctx = goodContext();
  ctx.project.hasStartScript = false;
  assert.ok(missingStartScript.evaluate(ctx));
});

test("missingHealthCheck: no finding when health check present", () => {
  assert.equal(missingHealthCheck.evaluate(goodContext()), null);
});

test("missingHealthCheck: finding when health check absent", () => {
  const ctx = goodContext();
  ctx.project.hasHealthCheck = false;
  assert.ok(missingHealthCheck.evaluate(ctx));
});

test("broadCorsConfig: no finding for an explicit origin allowlist", () => {
  assert.equal(broadCorsConfig.evaluate(goodContext()), null);
});

test("broadCorsConfig: finding when origins include a wildcard", () => {
  const ctx = goodContext();
  ctx.project.corsOrigins = ["*"];
  const finding = broadCorsConfig.evaluate(ctx);
  assert.ok(finding);
  assert.equal(finding?.severity, "high");
});
