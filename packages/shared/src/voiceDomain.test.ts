import { test } from "node:test";
import assert from "node:assert/strict";
import { TranscriptEntrySchema, VoiceSessionRequestSchema, VoiceSessionResponseSchema } from "./voiceDomain.js";

test("accepts a valid finalized transcript entry", () => {
  const entry = TranscriptEntrySchema.parse({
    id: "1",
    speaker: "developer",
    text: "I kept retries synchronous so the client gets an immediate result.",
    timestamp: new Date().toISOString(),
    final: true,
  });
  assert.equal(entry.speaker, "developer");
});

test("rejects an invalid speaker", () => {
  assert.throws(() =>
    TranscriptEntrySchema.parse({
      id: "1",
      speaker: "assistant",
      text: "hi",
      timestamp: new Date().toISOString(),
      final: true,
    }),
  );
});

test("rejects an oversized transcript entry", () => {
  assert.throws(() =>
    TranscriptEntrySchema.parse({
      id: "1",
      speaker: "reviewer",
      text: "x".repeat(5000),
      timestamp: new Date().toISOString(),
      final: true,
    }),
  );
});

test("rejects a non-final entry", () => {
  assert.throws(() =>
    TranscriptEntrySchema.parse({
      id: "1",
      speaker: "reviewer",
      text: "still speaking",
      timestamp: new Date().toISOString(),
      final: false,
    }),
  );
});

test("voice session request requires a non-empty scenario slug", () => {
  assert.throws(() => VoiceSessionRequestSchema.parse({ scenarioSlug: "" }));
  assert.doesNotThrow(() => VoiceSessionRequestSchema.parse({ scenarioSlug: "payment-retry" }));
});

test("voice session response never types in an API key or private fields", () => {
  const parsed = VoiceSessionResponseSchema.parse({
    signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?...",
    dynamicVariables: { developer_name: "Alex Chen" },
    developer: { name: "Alex Chen", role: "Backend engineer" },
  });
  assert.equal(Object.keys(parsed).includes("apiKey"), false);
});
