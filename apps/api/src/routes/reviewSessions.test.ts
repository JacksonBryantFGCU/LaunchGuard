import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

async function createSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/review-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { id: string };
  return body.id;
}

test("POST /api/review-sessions creates a draft session", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/review-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "draft");
    assert.equal(body.scenarioSlug, "black-friday-checkout");
  });
});

test("POST /api/review-sessions rejects an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
      });
      assert.equal(res.status, 401);
    },
    { userId: null },
  );
});

test("POST /api/review-sessions rejects an unknown scenario with 404", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/review-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "not-real" }),
    });
    assert.equal(res.status, 404);
  });
});

test("GET /api/review-sessions/:id returns 403 for a different user", async () => {
  const { InMemoryReviewRepository } = await import("../services/reviewRepository.js");
  const repository = new InMemoryReviewRepository();
  const id = await withTestServer(async (baseUrl) => createSession(baseUrl), { userId: "user_a", repository });
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions/${id}`);
      assert.equal(res.status, 403);
    },
    { userId: "user_b", repository },
  );
});

test("PATCH /api/review-sessions/:id persists draft fields", async () => {
  await withTestServer(async (baseUrl) => {
    const id = await createSession(baseUrl);
    const patchRes = await fetch(`${baseUrl}/api/review-sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedNodeIds: ["checkout-service"], reviewerNotes: "note" }),
    });
    assert.equal(patchRes.status, 200);

    const getRes = await fetch(`${baseUrl}/api/review-sessions/${id}`);
    const body = (await getRes.json()) as Record<string, unknown>;
    assert.deepEqual(body.reviewedNodeIds, ["checkout-service"]);
    assert.equal(body.reviewerNotes, "note");
  });
});

test("redline create/update/delete round-trip over HTTP", async () => {
  await withTestServer(async (baseUrl) => {
    const id = await createSession(baseUrl);
    const redline = {
      id: "redline-1",
      targetType: "node",
      targetId: "checkout-service",
      category: "reliability",
      severity: "high",
      title: "Missing timeout",
      reasoning: "A provider degradation could hold requests open indefinitely.",
      createdAt: new Date().toISOString(),
    };

    const createRes = await fetch(`${baseUrl}/api/review-sessions/${id}/redlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(redline),
    });
    assert.equal(createRes.status, 200);

    const updateRes = await fetch(`${baseUrl}/api/review-sessions/${id}/redlines/redline-1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    assert.equal(updateRes.status, 200);
    const updated = (await updateRes.json()) as { redlines: { title: string }[] };
    assert.equal(updated.redlines[0]?.title, "Renamed");

    const deleteRes = await fetch(`${baseUrl}/api/review-sessions/${id}/redlines/redline-1`, { method: "DELETE" });
    assert.equal(deleteRes.status, 200);
    const afterDelete = (await deleteRes.json()) as { redlines: unknown[] };
    assert.equal(afterDelete.redlines.length, 0);
  });
});

test("POST /api/review-sessions/:id/submit locks the session; further PATCH returns 409", async () => {
  await withTestServer(async (baseUrl) => {
    const id = await createSession(baseUrl);
    const submitRes = await fetch(`${baseUrl}/api/review-sessions/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendation: "approve",
        finalRationale: "The architecture appears ready to proceed given the stated constraints.",
      }),
    });
    assert.equal(submitRes.status, 200);
    const submitted = (await submitRes.json()) as Record<string, unknown>;
    assert.equal(submitted.status, "submitted");

    const patchRes = await fetch(`${baseUrl}/api/review-sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerNotes: "too late" }),
    });
    assert.equal(patchRes.status, 409);
  });
});
