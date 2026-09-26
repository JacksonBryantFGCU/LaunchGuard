import { test } from "node:test";
import assert from "node:assert/strict";
import { runRules, type Rule } from "./engine.js";
import { baseAnalysis } from "./testFixtures.js";

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
  const findings = runRules([alwaysFinds, neverFinds], { analysis: baseAnalysis() });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, "always-finds");
});

test("runRules returns no findings when all rules are satisfied", () => {
  const findings = runRules([neverFinds, neverFinds], { analysis: baseAnalysis() });
  assert.deepEqual(findings, []);
});
