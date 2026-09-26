import { test } from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@launchguard/shared";
import { summarize, buildScanResult } from "./index.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "r",
    title: "t",
    severity: "medium",
    category: "configuration",
    explanation: "e",
    remediation: "m",
    evidence: [],
    ...overrides,
  };
}

test("summarize counts findings by severity and category", () => {
  const summary = summarize([
    finding({ severity: "high", category: "security" }),
    finding({ severity: "high", category: "operability" }),
    finding({ severity: "low", category: "configuration" }),
  ]);

  assert.equal(summary.totalFindings, 3);
  assert.equal(summary.bySeverity.high, 2);
  assert.equal(summary.bySeverity.low, 1);
  assert.equal(summary.bySeverity.critical, 0);
  assert.equal(summary.byCategory.security, 1);
  assert.equal(summary.byCategory.operability, 1);
  assert.equal(summary.byCategory.reliability, 0);
});

test("summarize returns zeroed counts for no findings", () => {
  const summary = summarize([]);
  assert.equal(summary.totalFindings, 0);
  assert.equal(summary.bySeverity.info, 0);
});

test("buildScanResult attaches project name, timestamp, and summary", () => {
  const result = buildScanResult("demo", [finding()]);
  assert.equal(result.projectName, "demo");
  assert.equal(result.findings.length, 1);
  assert.equal(result.summary.totalFindings, 1);
  assert.ok(!Number.isNaN(Date.parse(result.scannedAt)));
});
