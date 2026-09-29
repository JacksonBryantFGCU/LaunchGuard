import { test } from "node:test";
import assert from "node:assert/strict";
import { SystemSummarySchema, CreateSystemInputSchema, UpdateSystemInputSchema } from "./system.js";

test("SystemSummarySchema accepts a sample system with a null owner", () => {
  const result = SystemSummarySchema.safeParse({
    id: "black-friday-checkout",
    slug: "black-friday-checkout",
    name: "Black Friday Checkout",
    sourceType: "sample",
    visibility: "public",
    ownerUserId: null,
    componentCount: 6,
    scenarioCount: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.ok(result.success);
});

test("SystemSummarySchema accepts a manual system owned by a user", () => {
  const result = SystemSummarySchema.safeParse({
    id: "sys_1",
    slug: "payment-platform",
    name: "Payment Platform",
    sourceType: "manual",
    visibility: "private",
    ownerUserId: "user_123",
    componentCount: 0,
    scenarioCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.ok(result.success);
});

test("SystemSummarySchema rejects an unknown sourceType", () => {
  const result = SystemSummarySchema.safeParse({
    id: "sys_1",
    slug: "sys-1",
    name: "Sys 1",
    sourceType: "imported",
    visibility: "private",
    ownerUserId: "user_123",
    componentCount: 0,
    scenarioCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("CreateSystemInputSchema requires only a name", () => {
  assert.ok(CreateSystemInputSchema.safeParse({ name: "Test Payments" }).success);
  assert.equal(CreateSystemInputSchema.safeParse({ name: "" }).success, false);
  assert.equal(CreateSystemInputSchema.safeParse({}).success, false);
});

test("UpdateSystemInputSchema allows a partial patch", () => {
  assert.ok(UpdateSystemInputSchema.safeParse({ description: "Updated" }).success);
  assert.ok(UpdateSystemInputSchema.safeParse({}).success);
});
