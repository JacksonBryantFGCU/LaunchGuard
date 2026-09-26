import { test } from "node:test";
import assert from "node:assert/strict";
import { ArchitectConversationEvidenceSchema, ArchitectConversationTurnSchema } from "./conversationTranscript.js";

function validTurn() {
  return {
    id: "turn-1",
    speaker: "reviewer",
    text: "Why is the payment call synchronous?",
    timestamp: new Date().toISOString(),
    final: true,
  };
}

test("accepts a valid conversation turn", () => {
  assert.doesNotThrow(() => ArchitectConversationTurnSchema.parse(validTurn()));
});

test("rejects an invalid speaker", () => {
  assert.throws(() => ArchitectConversationTurnSchema.parse({ ...validTurn(), speaker: "moderator" }));
});

test("rejects empty turn text", () => {
  assert.throws(() => ArchitectConversationTurnSchema.parse({ ...validTurn(), text: "" }));
});

test("rejects turn text over the length limit", () => {
  assert.throws(() => ArchitectConversationTurnSchema.parse({ ...validTurn(), text: "x".repeat(4001) }));
});

test("accepts valid conversation evidence", () => {
  assert.doesNotThrow(() =>
    ArchitectConversationEvidenceSchema.parse({
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      turns: [validTurn()],
    }),
  );
});

test("accepts conversation evidence with no endedAt (call still in flight)", () => {
  assert.doesNotThrow(() =>
    ArchitectConversationEvidenceSchema.parse({
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      turns: [],
    }),
  );
});

test("rejects more turns than the bounded maximum", () => {
  const turns = Array.from({ length: 301 }, (_, i) => ({ ...validTurn(), id: `turn-${i}` }));
  assert.throws(() => ArchitectConversationEvidenceSchema.parse({ conversationId: "conv-1", startedAt: new Date().toISOString(), turns }));
});

test("strips unrecognized provider-specific fields from a turn", () => {
  const parsed = ArchitectConversationTurnSchema.parse({ ...validTurn(), event_id: 42, raw_provider_payload: { anything: true } });
  assert.equal((parsed as Record<string, unknown>).event_id, undefined);
  assert.equal((parsed as Record<string, unknown>).raw_provider_payload, undefined);
});
