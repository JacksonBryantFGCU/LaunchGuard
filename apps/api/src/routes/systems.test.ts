import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";
import { InMemorySystemRepository } from "../services/systemRepository.js";

test("GET /api/systems returns the Black Friday sample plus the user's own systems", async () => {
  const systemRepository = new InMemorySystemRepository();
  await systemRepository.createSystem("user_test_default", { name: "Mine" });
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>[];
    assert.ok(body.some((s) => s.slug === "black-friday-checkout"));
    assert.ok(body.some((s) => s.name === "Mine"));
  }, { systemRepository });
});

test("POST /api/systems creates a manual system for the signed-in user", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Payments" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.name, "Test Payments");
    assert.equal(body.sourceType, "manual");
  });
});

test("POST /api/systems rejects a missing name", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

test("GET /api/systems/:id returns the sample system", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems/black-friday-checkout`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.sourceType, "sample");
  });
});

test("GET /api/systems/:id denies another user's private system", async () => {
  const systemRepository = new InMemorySystemRepository();
  const created = await systemRepository.createSystem("owner_user", { name: "Private" });
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems/${created.id}`);
    assert.equal(res.status, 404);
  }, { systemRepository });
});

test("PATCH /api/systems/:id denies mutating the sample system", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/systems/black-friday-checkout`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Hacked" }),
    });
    assert.equal(res.status, 403);
  });
});

test("PATCH /api/systems/:id lets the owner rename their own system", async () => {
  await withTestServer(async (baseUrl) => {
    const createRes = await fetch(`${baseUrl}/api/systems`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Original" }),
    });
    const created = (await createRes.json()) as Record<string, unknown>;
    const patchRes = await fetch(`${baseUrl}/api/systems/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    assert.equal(patchRes.status, 200);
    const patched = (await patchRes.json()) as Record<string, unknown>;
    assert.equal(patched.name, "Renamed");
  });
});
