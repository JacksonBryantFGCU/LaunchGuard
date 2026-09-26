import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("GET /api/scenarios returns the Payment Retry preview", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios`);
    assert.equal(res.status, 200);
    const body: unknown = await res.json();
    assert.ok(Array.isArray(body));
    const paymentRetry = (body as { slug: string }[]).find((s) => s.slug === "payment-retry");
    assert.ok(paymentRetry);
    assert.equal((paymentRetry as Record<string, unknown>).title, "Payment Retry");
    assert.equal((paymentRetry as Record<string, unknown>).hiddenIssues, undefined);
    assert.equal((paymentRetry as Record<string, unknown>).evaluationRubric, undefined);
  });
});

test("GET /api/scenarios/payment-retry returns full public scenario detail", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios/payment-retry`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.slug, "payment-retry");
    assert.equal((body.pullRequest as Record<string, unknown>).number, 142);
    const files = body.files as Record<string, unknown>[];
    assert.equal(files.length, 3);
    assert.ok(typeof files[0].newContent === "string" && (files[0].newContent as string).length > 0);
    assert.equal(body.hiddenIssues, undefined);
    assert.equal(body.hiddenTests, undefined);
    assert.equal(body.evaluationRubric, undefined);
    assert.equal(body.developerPersona, undefined);
  });
});

test("GET /api/scenarios/nonexistent returns a clean 404", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios/nonexistent`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "scenario_not_found");
  });
});
