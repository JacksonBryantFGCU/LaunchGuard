import { test } from "node:test";
import assert from "node:assert/strict";
import type { RuleContext } from "@launchguard/shared";
import { runRules, type Rule } from "./engine.js";

function baseContext(): RuleContext {
  return {
    project: {
      name: "sample",
      hasEnvExample: true,
      hasBuildScript: true,
      hasStartScript: true,
      hasHealthCheck: true,
    },
  };
}

const alwaysFinds: Rule = {
  id: "always-finds",
  name: "Always finds",
  description: "test rule",
  category: "configuration",
  defaultSeverity: "low",
  evaluate() {
    return {
      ruleId: "always-finds",
      title: "Found something",
      severity: "low",
      category: "configuration",
      explanation: "x",
      remediation: "y",
      evidence: [],
    };
  },
};

const neverFinds: Rule = {
  id: "never-finds",
  name: "Never finds",
  description: "test rule",
  category: "configuration",
  defaultSeverity: "low",
  evaluate() {
    return null;
  },
};

test("runRules aggregates findings across multiple rules", () => {
  const findings = runRules([alwaysFinds, neverFinds], baseContext());
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, "always-finds");
});

test("runRules returns no findings when all rules are satisfied", () => {
  const findings = runRules([neverFinds, neverFinds], baseContext());
  assert.deepEqual(findings, []);
});
