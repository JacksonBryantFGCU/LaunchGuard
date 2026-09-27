import { test } from "node:test";
import assert from "node:assert/strict";
import { createVoiceSession, type VoiceSessionDeps } from "./voiceSessionService.js";

function configuredDeps(overrides: Partial<VoiceSessionDeps> = {}): VoiceSessionDeps {
  return {
    apiKey: "test-api-key",
    agentId: "test-agent-id",
    requestSignedUrl: async () => ({ signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?token=abc" }),
    ...overrides,
  };
}

test("accepts a valid scenario and configured provider, returning a safe session", async () => {
  const result = await createVoiceSession({ scenarioSlug: "black-friday-checkout" }, configuredDeps());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.signedUrl, "wss://api.elevenlabs.io/v1/convai/conversation?token=abc");
    assert.ok(Object.keys(result.result.dynamicVariables).length > 0);
  }
});

test("rejects a malformed request", async () => {
  const result = await createVoiceSession({}, configuredDeps());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "INVALID_REQUEST");
});

test("rejects an unknown scenario", async () => {
  const result = await createVoiceSession({ scenarioSlug: "not-real" }, configuredDeps());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 404);
    assert.equal(result.error, "INVALID_SCENARIO");
  }
});

test("reports voice as not configured when credentials are missing", async () => {
  const result = await createVoiceSession(
    { scenarioSlug: "black-friday-checkout" },
    configuredDeps({ apiKey: undefined }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.error, "VOICE_NOT_CONFIGURED");
  }
});

test("maps a provider failure to a safe error without leaking provider details", async () => {
  const result = await createVoiceSession(
    { scenarioSlug: "black-friday-checkout" },
    configuredDeps({
      requestSignedUrl: async () => {
        throw new Error("ElevenLabs API responded with status 401 for key sk_super_secret");
      },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 502);
    assert.equal(result.error, "VOICE_PROVIDER_UNAVAILABLE");
    assert.ok(!result.message.includes("sk_super_secret"));
  }
});

test("forwards the learner's selected Stress Lab focus into the dynamic variables", async () => {
  const result = await createVoiceSession(
    {
      scenarioSlug: "black-friday-checkout",
      focus: { focusLabel: "Postgres", bottleneckSummary: "Connections: 500/500 (threshold 500)" },
    },
    configuredDeps(),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.dynamicVariables.stress_focus_component, "Postgres");
    assert.equal(result.result.dynamicVariables.stress_focus_bottleneck, "Connections: 500/500 (threshold 500)");
  }
});

test("omitted focus fields become empty strings, never undefined or missing keys", async () => {
  const result = await createVoiceSession({ scenarioSlug: "black-friday-checkout" }, configuredDeps());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.dynamicVariables.stress_focus_component, "");
    assert.equal(result.result.dynamicVariables.stress_focus_requirement, "");
  }
});

test("never includes the API key or hidden scenario truth in the response", async () => {
  const result = await createVoiceSession({ scenarioSlug: "black-friday-checkout" }, configuredDeps());
  assert.ok(result.ok);
  if (result.ok) {
    const serialized = JSON.stringify(result.result);
    assert.ok(!serialized.includes("test-api-key"));
    assert.ok(!serialized.includes("hiddenRisks"));
    assert.ok(!serialized.includes("stressTests"));
    assert.ok(!serialized.includes("evaluationRubric"));
    const allowedKeys = new Set(["signedUrl", "dynamicVariables"]);
    for (const key of Object.keys(result.result)) {
      assert.ok(allowedKeys.has(key), `unexpected key in voice session response: ${key}`);
    }
  }
});
