import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("POST /api/scans rejects a missing repositoryUrl", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "INVALID_REPOSITORY_URL");
  });
});

test("POST /api/scans rejects an unsupported repository host", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repositoryUrl: "https://gitlab.com/owner/repo" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "UNSUPPORTED_REPOSITORY_HOST");
  });
});

test("POST /api/scans rejects a malformed URL", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repositoryUrl: "not a url" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "INVALID_REPOSITORY_URL");
  });
});
