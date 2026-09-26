import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ELEVENLABS_API_KEY = "test-key";
process.env.ELEVENLABS_AGENT_ID = "test-agent";

const { createVoiceSession, VoiceError } = await import("./voiceService.js");

function withMockedFetch(handler: typeof fetch, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test("returns a safe session for a known scenario", async () => {
  await withMockedFetch(
    (async () => new Response(JSON.stringify({ signed_url: "wss://example.com/signed" }), { status: 200 })) as typeof fetch,
    async () => {
      const result = await createVoiceSession({ scenarioSlug: "payment-retry" });
      assert.equal(result.signedUrl, "wss://example.com/signed");
      assert.equal(result.developer.name, "Alex Chen");
      assert.equal(result.dynamicVariables.developer_name, "Alex Chen");
      assert.equal(Object.prototype.hasOwnProperty.call(result, "apiKey"), false);
    },
  );
});

test("rejects an unknown scenario without calling ElevenLabs", async () => {
  let called = false;
  await withMockedFetch(
    (async () => {
      called = true;
      return new Response(JSON.stringify({ signed_url: "wss://example.com/signed" }), { status: 200 });
    }) as typeof fetch,
    async () => {
      await assert.rejects(() => createVoiceSession({ scenarioSlug: "nonexistent" }), VoiceError);
    },
  );
  assert.equal(called, false);
});

test("rejects malformed input", async () => {
  await assert.rejects(() => createVoiceSession({ scenarioSlug: "" }));
});

test("maps a provider failure to VOICE_PROVIDER_UNAVAILABLE", async () => {
  await withMockedFetch(
    (async () => new Response("", { status: 500 })) as typeof fetch,
    async () => {
      await assert.rejects(
        () => createVoiceSession({ scenarioSlug: "payment-retry" }),
        (err: unknown) => err instanceof VoiceError && err.code === "VOICE_PROVIDER_UNAVAILABLE",
      );
    },
  );
});

test("session response never contains hidden scenario truth", async () => {
  await withMockedFetch(
    (async () => new Response(JSON.stringify({ signed_url: "wss://example.com/signed" }), { status: 200 })) as typeof fetch,
    async () => {
      const result = await createVoiceSession({ scenarioSlug: "payment-retry" });
      const serialized = JSON.stringify(result);
      assert.ok(!serialized.includes("hiddenIssues"));
      assert.ok(!serialized.includes("duplicate-payment-charges"));
      assert.ok(!serialized.includes("evaluationRubric"));
      assert.ok(!serialized.includes("test-key"));
    },
  );
});
