import { test } from "node:test";
import assert from "node:assert/strict";
import { createVoiceSession, VoiceError } from "./voiceService.js";

test("reports VOICE_CONFIGURATION_MISSING when ElevenLabs credentials are absent", async () => {
  await assert.rejects(
    () => createVoiceSession({ scenarioSlug: "payment-retry" }),
    (err: unknown) => err instanceof VoiceError && err.code === "VOICE_CONFIGURATION_MISSING",
  );
});
