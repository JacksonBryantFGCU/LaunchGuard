import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMessageEvent } from "./transcriptNormalization.js";

const TS = "2026-01-01T00:00:00.000Z";

test("normalizes a reviewer (user) message", () => {
  const turn = normalizeMessageEvent({ role: "user", message: "Why is the payment call synchronous?" }, TS);
  assert.ok(turn);
  assert.equal(turn!.speaker, "reviewer");
  assert.equal(turn!.text, "Why is the payment call synchronous?");
  assert.equal(turn!.final, true);
});

test("normalizes an architect (agent) message", () => {
  const turn = normalizeMessageEvent({ role: "agent", message: "We wanted an authoritative result before creating the order." }, TS);
  assert.ok(turn);
  assert.equal(turn!.speaker, "architect");
});

test("derives a stable id from the provider event id when present", () => {
  const turn = normalizeMessageEvent({ role: "user", message: "hi", eventId: 42 }, TS);
  assert.equal(turn!.id, "turn-42");
});

test("trims message whitespace", () => {
  const turn = normalizeMessageEvent({ role: "user", message: "  hello there  " }, TS);
  assert.equal(turn!.text, "hello there");
});

test("ignores an empty message", () => {
  assert.equal(normalizeMessageEvent({ role: "user", message: "   " }, TS), null);
});

test("ignores an unrecognized role", () => {
  assert.equal(normalizeMessageEvent({ role: "system", message: "debug info" }, TS), null);
});
