import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyStressLabAvailability } from "./loadState.js";

test("one or more test definitions means the Stress Lab is ready to render normally", () => {
  assert.equal(classifyStressLabAvailability(3), "ready");
});

test("zero test definitions means this scenario intentionally has no Stress Lab support yet", () => {
  assert.equal(classifyStressLabAvailability(0), "unsupported");
});
