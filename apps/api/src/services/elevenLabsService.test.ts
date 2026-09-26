import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignedConversationUrl, ElevenLabsProviderError } from "./elevenLabsService.js";

function withMockedFetch(handler: typeof fetch, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test("sends the API key only as a request header, never in the URL or body", async () => {
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};

  await withMockedFetch(
    (async (url: string | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ signed_url: "wss://example.com/signed" }), { status: 200 });
    }) as typeof fetch,
    async () => {
      const result = await createSignedConversationUrl({ apiKey: "super-secret", agentId: "agent-123" });
      assert.equal(result.signedUrl, "wss://example.com/signed");
      assert.ok(capturedUrl.includes("agent_id=agent-123"));
      assert.equal(capturedHeaders["xi-api-key"], "super-secret");
      assert.equal(capturedUrl.includes("super-secret"), false);
    },
  );
});

test("maps a non-ok provider response to ElevenLabsProviderError", async () => {
  await withMockedFetch(
    (async () => new Response("", { status: 401 })) as typeof fetch,
    async () => {
      await assert.rejects(() => createSignedConversationUrl({ apiKey: "x", agentId: "y" }), ElevenLabsProviderError);
    },
  );
});

test("maps a malformed provider response to ElevenLabsProviderError", async () => {
  await withMockedFetch(
    (async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 })) as typeof fetch,
    async () => {
      await assert.rejects(() => createSignedConversationUrl({ apiKey: "x", agentId: "y" }), ElevenLabsProviderError);
    },
  );
});

test("maps a network failure to ElevenLabsProviderError", async () => {
  await withMockedFetch(
    (async () => {
      throw new Error("network down");
    }) as typeof fetch,
    async () => {
      await assert.rejects(() => createSignedConversationUrl({ apiKey: "x", agentId: "y" }), ElevenLabsProviderError);
    },
  );
});
