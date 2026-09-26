import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { createRequireAuth, getUserId } from "./auth.js";

function appWithFakeAuth(userId: string | null) {
  const app = express();
  const requireAuth = createRequireAuth(() => ({ userId }));
  app.get("/protected", requireAuth, (req, res) => {
    res.json({ userId: getUserId(req) });
  });
  return app;
}

async function withServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("failed to determine test server address");
  }
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
}

test("requireAuth rejects an unauthenticated request with 401", async () => {
  await withServer(appWithFakeAuth(null), async (baseUrl) => {
    const res = await fetch(`${baseUrl}/protected`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "unauthorized");
  });
});

test("requireAuth lets an authenticated request reach the handler with the verified user id", async () => {
  await withServer(appWithFakeAuth("user_123"), async (baseUrl) => {
    const res = await fetch(`${baseUrl}/protected`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.userId, "user_123");
  });
});
