import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";

test("GET /api/scenarios returns the Black Friday Checkout preview", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>[];
    assert.ok(Array.isArray(body));
    const preview = body.find((s) => s.slug === "black-friday-checkout");
    assert.ok(preview);
    assert.equal(preview.title, "Black Friday Checkout Redesign");
    // Preview should stay lightweight - no full graph/requirements payload.
    assert.equal(preview.nodes, undefined);
    assert.equal(preview.requirements, undefined);
    assert.equal(preview.hiddenRisks, undefined);
  });
});

test("GET /api/scenarios/black-friday-checkout returns full public architecture data", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios/black-friday-checkout`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.slug, "black-friday-checkout");
    assert.ok(Array.isArray(body.nodes));
    assert.ok(Array.isArray(body.edges));
    assert.ok(Array.isArray(body.requirements));
    assert.equal(body.hiddenRisks, undefined);
    assert.equal(body.stressTests, undefined);
    assert.equal(body.evaluationRubric, undefined);
    assert.equal(body.expectedReviewerInsight, undefined);
  });
});

test("GET /api/scenarios/not-real returns a clean 404", async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/scenarios/not-real`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.error, "scenario_not_found");
  });
});
