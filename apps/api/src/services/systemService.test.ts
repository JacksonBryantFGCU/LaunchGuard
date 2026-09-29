import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemorySystemRepository } from "./systemRepository.js";
import { listSystems, getSystem, createSystem, updateSystem } from "./systemService.js";

test("listSystems includes sample systems and the user's own manual systems", async () => {
  const repo = new InMemorySystemRepository();
  await repo.createSystem("user_1", { name: "Payment Platform" });
  const systems = await listSystems(repo, "user_1");
  assert.ok(systems.some((s) => s.slug === "black-friday-checkout" && s.sourceType === "sample"));
  assert.ok(systems.some((s) => s.name === "Payment Platform" && s.sourceType === "manual"));
});

test("listSystems never returns another user's private manual system", async () => {
  const repo = new InMemorySystemRepository();
  await repo.createSystem("user_1", { name: "Owner Only" });
  const systems = await listSystems(repo, "user_2");
  assert.ok(!systems.some((s) => s.name === "Owner Only"));
});

test("getSystem returns the sample system for any user", async () => {
  const repo = new InMemorySystemRepository();
  const result = await getSystem(repo, "user_1", "black-friday-checkout");
  assert.ok(result.ok);
  assert.equal(result.result?.sourceType, "sample");
});

test("getSystem returns the owner's own manual system", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "Mine" });
  const result = await getSystem(repo, "user_1", created.id);
  assert.ok(result.ok);
  assert.equal(result.result?.name, "Mine");
});

test("getSystem denies another user's private manual system", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "Mine" });
  const result = await getSystem(repo, "user_2", created.id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("getSystem returns 404 for an unknown id", async () => {
  const repo = new InMemorySystemRepository();
  const result = await getSystem(repo, "user_1", "does-not-exist");
  assert.equal(result.ok, false);
});

test("createSystem creates a manual system owned by the caller", async () => {
  const repo = new InMemorySystemRepository();
  const result = await createSystem(repo, "user_1", { name: "New System" });
  assert.ok(result.ok);
  assert.equal(result.result?.sourceType, "manual");
  assert.equal(result.result?.ownerUserId, "user_1");
});

test("updateSystem denies mutating a sample system", async () => {
  const repo = new InMemorySystemRepository();
  const result = await updateSystem(repo, "user_1", "black-friday-checkout", { name: "Hacked" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("updateSystem denies mutating another user's manual system", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "Mine" });
  const result = await updateSystem(repo, "user_2", created.id, { name: "Hacked" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("updateSystem lets the owner patch their own manual system", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "Mine" });
  const result = await updateSystem(repo, "user_1", created.id, { name: "Renamed" });
  assert.ok(result.ok);
  assert.equal(result.result?.name, "Renamed");
});
