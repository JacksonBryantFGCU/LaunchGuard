import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("POST /api/voice/sessions rejects a malformed request", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "INVALID_REQUEST");
  });
});

test("POST /api/voice/sessions rejects an unknown scenario", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "not-real" }),
    });
    assert.equal(res.status, 404);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "INVALID_SCENARIO");
  });
});

// No ELEVENLABS_API_KEY/ELEVENLABS_AGENT_ID are configured in this test
// environment, so a known-good scenario deterministically exercises the
// "not configured" branch through the real route (no ElevenLabs contacted).
test("POST /api/voice/sessions reports voice as not configured when credentials are absent", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
    });
    assert.equal(res.status, 503);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "VOICE_NOT_CONFIGURED");
    assert.equal(body.hiddenRisks, undefined);
  });
});
