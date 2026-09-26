import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ELEVENLABS_API_KEY = "test-key";
process.env.ELEVENLABS_AGENT_ID = "test-agent";

const { withTestServer } = await import("../testUtils.js");

// Only the outbound ElevenLabs call gets mocked - the test's own request to
// the local test server must still hit the real network stack.
function withMockedElevenLabsFetch(handler: typeof fetch) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("elevenlabs.io")) {
      return handler(input, init);
    }
    return original(input, init);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test("POST /api/voice/sessions returns a safe session for a known scenario", async () => {
  const restore = withMockedElevenLabsFetch(
    (async () => new Response(JSON.stringify({ signed_url: "wss://example.com/signed" }), { status: 200 })) as typeof fetch,
  );
  try {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/voice/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioSlug: "payment-retry" }),
      });
      assert.equal(res.status, 201);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.signedUrl, "wss://example.com/signed");
      assert.equal((body.developer as Record<string, unknown>).name, "Alex Chen");
      assert.equal(body.hiddenIssues, undefined);
      assert.equal(body.evaluationRubric, undefined);
      const serialized = JSON.stringify(body);
      assert.ok(!serialized.includes("test-key"));
    });
  } finally {
    restore();
  }
});

test("POST /api/voice/sessions rejects an unknown scenario", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "nonexistent" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "INVALID_SCENARIO");
  });
});

test("POST /api/voice/sessions rejects malformed input", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/voice/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /api/voice/sessions maps a provider failure safely", async () => {
  const restore = withMockedElevenLabsFetch((async () => new Response("", { status: 500 })) as typeof fetch);
  try {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/voice/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioSlug: "payment-retry" }),
      });
      assert.equal(res.status, 502);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.error, "VOICE_PROVIDER_UNAVAILABLE");
      assert.equal(typeof body.message, "string");
    });
  } finally {
    restore();
  }
});
