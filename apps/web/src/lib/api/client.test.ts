import { test } from "node:test";
import assert from "node:assert/strict";
import { apiGet, apiPatch, apiDelete, setAuthTokenGetter } from "./client.js";

function withFakeFetch<T>(handler: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = realFetch;
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("a public request sends no Authorization header", async () => {
  setAuthTokenGetter(() => Promise.resolve("should-not-be-used"));
  let capturedHeaders: HeadersInit | undefined;
  await withFakeFetch(
    (async (_url, init) => {
      capturedHeaders = init?.headers;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiGet("/health", (d) => d),
  );
  setAuthTokenGetter(null);
  assert.ok(!capturedHeaders || !("Authorization" in (capturedHeaders as Record<string, string>)));
});

test("an authenticated request includes the Clerk bearer token", async () => {
  setAuthTokenGetter(() => Promise.resolve("tok_123"));
  let capturedHeaders: Record<string, string> | undefined;
  await withFakeFetch(
    (async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiGet("/api/reviews/x/stress-tests", (d) => d, { authed: true }),
  );
  setAuthTokenGetter(null);
  assert.equal(capturedHeaders?.Authorization, "Bearer tok_123");
});

test("an authenticated request with no token getter registered sends no Authorization header", async () => {
  setAuthTokenGetter(null);
  let capturedHeaders: Record<string, string> | undefined;
  await withFakeFetch(
    (async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiGet("/api/reviews/x/stress-tests", (d) => d, { authed: true }),
  );
  assert.ok(!capturedHeaders || !("Authorization" in capturedHeaders));
});

test("an authenticated request whose getter resolves to null sends no Authorization header", async () => {
  setAuthTokenGetter(() => Promise.resolve(null));
  let capturedHeaders: Record<string, string> | undefined;
  await withFakeFetch(
    (async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiGet("/api/reviews/x/stress-tests", (d) => d, { authed: true }),
  );
  setAuthTokenGetter(null);
  assert.ok(!capturedHeaders || !("Authorization" in capturedHeaders));
});

test("apiPatch sends a PATCH with a JSON body and the auth header", async () => {
  setAuthTokenGetter(() => Promise.resolve("tok_123"));
  let capturedMethod: string | undefined;
  let capturedBody: string | undefined;
  let capturedHeaders: Record<string, string> | undefined;
  await withFakeFetch(
    (async (_url, init) => {
      capturedMethod = init?.method;
      capturedBody = init?.body as string | undefined;
      capturedHeaders = init?.headers as Record<string, string>;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiPatch("/api/review-sessions/x", { reviewerNotes: "hi" }, (d) => d, { authed: true }),
  );
  setAuthTokenGetter(null);
  assert.equal(capturedMethod, "PATCH");
  assert.equal(capturedBody, JSON.stringify({ reviewerNotes: "hi" }));
  assert.equal(capturedHeaders?.Authorization, "Bearer tok_123");
});

test("apiDelete sends a DELETE with no body", async () => {
  let capturedMethod: string | undefined;
  let capturedBody: unknown;
  await withFakeFetch(
    (async (_url, init) => {
      capturedMethod = init?.method;
      capturedBody = init?.body;
      return jsonResponse({ ok: true });
    }) as typeof fetch,
    () => apiDelete("/api/review-sessions/x/redlines/y", (d) => d),
  );
  assert.equal(capturedMethod, "DELETE");
  assert.equal(capturedBody, undefined);
});

test("existing 404 error handling remains intact", async () => {
  await withFakeFetch(
    (async () => new Response("not found", { status: 404 })) as typeof fetch,
    async () => {
      await assert.rejects(() => apiGet("/api/scenarios/nope", (d) => d), /Not found/);
    },
  );
});
