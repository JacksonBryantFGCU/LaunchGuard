import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("POST /api/scans/analyze returns findings and a summary for a valid request", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scans/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: {
          name: "demo",
          hasEnvExample: false,
          hasBuildScript: true,
          hasStartScript: true,
          hasHealthCheck: true,
          corsOrigins: ["*"],
        },
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      projectName: string;
      summary: { totalFindings: number };
      findings: { ruleId: string }[];
    };
    assert.equal(body.projectName, "demo");
    assert.equal(body.summary.totalFindings, 2);
    const ruleIds = body.findings.map((f) => f.ruleId);
    assert.ok(ruleIds.includes("missing-env-example"));
    assert.ok(ruleIds.includes("broad-cors-config"));
  });
});

test("POST /api/scans/analyze rejects an invalid request", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scans/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: { name: "" } }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "invalid_request");
  });
});
