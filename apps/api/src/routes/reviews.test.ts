import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

function validSubmission() {
  return {
    scenarioSlug: "payment-retry",
    reviewedFiles: ["src/payments/paymentService.ts"],
    comments: [
      { id: "1", file: "src/payments/paymentService.ts", startLine: 10, endLine: 12, body: "No idempotency key here." },
    ],
    reviewerNotes: "",
    decision: "request_changes",
    finalExplanation: "Retries can duplicate a charge because no idempotency key is reused across attempts.",
  };
}

test("POST /api/reviews accepts a valid submission", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSubmission()),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "submitted");
    assert.equal(typeof body.reviewId, "string");
    assert.ok((body.reviewId as string).length > 0);
    assert.equal(body.hiddenIssues, undefined);
    assert.equal(body.evaluationRubric, undefined);
  });
});

test("POST /api/reviews rejects a malformed submission", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validSubmission(), decision: "not_a_decision" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "invalid_submission");
  });
});

test("POST /api/reviews rejects an unknown scenario", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validSubmission(), scenarioSlug: "nonexistent" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "invalid_submission");
  });
});

test("POST /api/reviews rejects a comment on an unknown file", async () => {
  await withTestServer(async (baseUrl) => {
    const submission = validSubmission();
    submission.comments = [{ id: "1", file: "src/nope.ts", startLine: 1, endLine: 1, body: "hmm" }];
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /api/reviews accepts a valid transcript as review evidence", async () => {
  await withTestServer(async (baseUrl) => {
    const submission = {
      ...validSubmission(),
      transcript: [
        { id: "t1", speaker: "reviewer", text: "Why synchronous retries?", timestamp: new Date().toISOString(), final: true },
        {
          id: "t2",
          speaker: "developer",
          text: "So the client gets an immediate result.",
          timestamp: new Date().toISOString(),
          final: true,
        },
      ],
    };
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    assert.equal(res.status, 201);
  });
});

test("POST /api/reviews rejects an invalid transcript speaker", async () => {
  await withTestServer(async (baseUrl) => {
    const submission = {
      ...validSubmission(),
      transcript: [{ id: "t1", speaker: "ai", text: "hi", timestamp: new Date().toISOString(), final: true }],
    };
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /api/reviews rejects an oversized transcript", async () => {
  await withTestServer(async (baseUrl) => {
    const transcript = Array.from({ length: 501 }, (_, i) => ({
      id: `t${i}`,
      speaker: "reviewer",
      text: "hi",
      timestamp: new Date().toISOString(),
      final: true,
    }));
    const submission = { ...validSubmission(), transcript };
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /api/reviews rejects a raw provider-shaped transcript object", async () => {
  await withTestServer(async (baseUrl) => {
    const submission = { ...validSubmission(), transcript: [{ message: "hi", source: "user" }] };
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /api/reviews ignores a client-supplied reviewId and submittedAt", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validSubmission(), reviewId: "client-supplied", submittedAt: "2000-01-01T00:00:00.000Z" }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as Record<string, unknown>;
    assert.notEqual(body.reviewId, "client-supplied");
    assert.notEqual(body.submittedAt, "2000-01-01T00:00:00.000Z");
  });
});
