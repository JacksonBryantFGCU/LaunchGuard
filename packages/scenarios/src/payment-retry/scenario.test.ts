import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentRetryScenario } from "./scenario.js";

test("scenario files have unique, non-empty paths", () => {
  const paths = paymentRetryScenario.files.map((f) => f.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((p) => p.length > 0));
});

test("scenario files carry real old/new source for modified files", () => {
  const modified = paymentRetryScenario.files.filter((f) => f.status === "modified");
  assert.ok(modified.length > 0);
  for (const file of modified) {
    assert.ok(file.oldContent.length > 0);
    assert.ok(file.newContent.length > 0);
  }
});

test("hidden issues reference files that exist in the scenario", () => {
  const knownPaths = new Set(paymentRetryScenario.files.map((f) => f.path));
  for (const issue of paymentRetryScenario.hiddenIssues) {
    assert.ok(knownPaths.has(issue.affectedFile), `${issue.id} references unknown file ${issue.affectedFile}`);
  }
});

test("hidden test issue references resolve to real hidden issues", () => {
  const knownIssueIds = new Set(paymentRetryScenario.hiddenIssues.map((i) => i.id));
  for (const hiddenTest of paymentRetryScenario.hiddenTests) {
    for (const issueId of hiddenTest.revealsIssueIds) {
      assert.ok(knownIssueIds.has(issueId), `${hiddenTest.id} references unknown issue ${issueId}`);
    }
  }
});

test("at least one hidden test fails and reveals the duplicate-charge issue", () => {
  const failing = paymentRetryScenario.hiddenTests.filter((t) => t.status === "fail");
  assert.ok(failing.some((t) => t.revealsIssueIds.includes("duplicate-payment-charges")));
});
