import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemorySystemRepository } from "./systemRepository.js";

test("createSystem persists a manual system owned by the creating user", async () => {
  const repo = new InMemorySystemRepository();
  const system = await repo.createSystem("user_1", { name: "Payment Platform" });
  assert.equal(system.ownerUserId, "user_1");
  assert.equal(system.name, "Payment Platform");
  assert.equal(system.slug, "payment-platform");
  assert.ok(system.id);
});

test("getSystem returns the created system by id", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "Payment Platform" });
  const found = await repo.getSystem(created.id);
  assert.deepEqual(found, created);
});

test("listUserSystems only returns systems owned by that user", async () => {
  const repo = new InMemorySystemRepository();
  await repo.createSystem("user_1", { name: "A" });
  await repo.createSystem("user_2", { name: "B" });
  const list = await repo.listUserSystems("user_1");
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "A");
});

test("updateSystem patches name/description and bumps updatedAt", async () => {
  const repo = new InMemorySystemRepository();
  const created = await repo.createSystem("user_1", { name: "A" });
  const updated = await repo.updateSystem(created.id, { name: "A2", description: "desc" });
  assert.equal(updated.name, "A2");
  assert.equal(updated.description, "desc");
  assert.ok(updated.updatedAt >= created.updatedAt);
});
