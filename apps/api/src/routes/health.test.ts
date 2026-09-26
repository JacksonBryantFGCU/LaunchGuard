import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("GET /health returns a structured ok status", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: "ok" });
  });
});
