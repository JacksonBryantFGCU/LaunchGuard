import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePublishableKey } from "./clerkConfig.js";

test("returns the key when present", () => {
  assert.equal(resolvePublishableKey("pk_test_abc"), "pk_test_abc");
});

test("throws a clear startup error when the key is missing", () => {
  assert.throws(() => resolvePublishableKey(undefined), /VITE_CLERK_PUBLISHABLE_KEY/);
});

test("throws a clear startup error when the key is an empty string", () => {
  assert.throws(() => resolvePublishableKey(""), /VITE_CLERK_PUBLISHABLE_KEY/);
});
