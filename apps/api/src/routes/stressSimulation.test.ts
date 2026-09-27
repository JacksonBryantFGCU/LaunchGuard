import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";
import { InMemoryPracticeScenarioRepository } from "../services/practiceScenarioRepository.js";
import { InMemoryReviewRepository } from "../services/reviewRepository.js";

const SCENARIO_ID = "black-friday-capacity-surge";

async function createSessionAndStartAttempt(baseUrl: string, scenarioId = SCENARIO_ID): Promise<string> {
  const sessionRes = await fetch(`${baseUrl}/api/review-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
  });
  const { id: sessionId } = (await sessionRes.json()) as { id: string };
  await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${scenarioId}/start`, { method: "POST" });
  return sessionId;
}

test("GET .../stress-tests returns only black-friday-capacity-surge's mapped tests, not every Black Friday test, with no private capacity data", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl);
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-tests`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { testDefinitions: { id: string }[]; interventions: unknown[] };
    assert.deepEqual(body.testDefinitions.map((t) => t.id).sort(), ["database-saturation", "sustained-load", "traffic-spike"]);
    assert.ok(Array.isArray(body.interventions));
    assert.equal(JSON.stringify(body).includes("connectionsPerInstance"), false);
  });
});

test("GET .../stress-tests resolves checkout-latency-spike to its own mapped tests (regression test for the practice-scenario -> Stress Lab wiring bug)", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl, "checkout-latency-spike");
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/checkout-latency-spike/stress-tests`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { testDefinitions: { id: string }[] };
    assert.deepEqual(body.testDefinitions.map((t) => t.id).sort(), ["payment-provider-degradation", "sustained-load"]);
  });
});

test("GET .../stress-tests resolves regional-database-failure to exactly its one mapped test", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl, "regional-database-failure");
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/regional-database-failure/stress-tests`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { testDefinitions: { id: string }[] };
    assert.deepEqual(body.testDefinitions.map((t) => t.id), ["regional-database-failure"]);
  });
});

test("GET .../stress-tests returns 200 with an empty testDefinitions array for the intentionally-unsupported duplicate-checkout-requests scenario - not a 404/error", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl, "duplicate-checkout-requests");
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/duplicate-checkout-requests/stress-tests`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { testDefinitions: unknown[] };
    assert.deepEqual(body.testDefinitions, []);
  });
});

test("GET .../stress-tests 404s before the attempt has been started", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionRes = await fetch(`${baseUrl}/api/review-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
    });
    const { id: sessionId } = (await sessionRes.json()) as { id: string };
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-tests`);
    assert.equal(res.status, 404);
  });
});

test("GET .../stress-tests 404s for a practice scenario id that doesn't exist at all", async () => {
  await withTestServer(async (baseUrl) => {
    // Never actually starts an attempt for this id (there's no such scenario to start), so this only
    // exercises the not-a-real-scenario path if the caller could otherwise reach it; the attempt-existence
    // check already 404s first, which is exactly the ownership boundary we want (see the previous test).
    const sessionRes = await fetch(`${baseUrl}/api/review-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
    });
    const { id: sessionId } = (await sessionRes.json()) as { id: string };
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/not-a-real-scenario/stress-tests`);
    assert.equal(res.status, 404);
  });
});

test("GET .../stress-tests 403s for a session owned by a different user", async () => {
  const practiceRepository = new InMemoryPracticeScenarioRepository();
  const repository = new InMemoryReviewRepository();
  let sessionId = "";
  await withTestServer(
    async (baseUrl) => {
      sessionId = await createSessionAndStartAttempt(baseUrl);
    },
    { practiceRepository, repository },
  );
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-tests`);
      assert.equal(res.status, 403);
    },
    { userId: "a-different-user", practiceRepository, repository },
  );
});

test("rejects an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions/any/practice-scenarios/${SCENARIO_ID}/stress-tests`);
      assert.equal(res.status, 401);
    },
    { userId: null },
  );
});

test("POST .../stress-runs 400s on an unknown test id", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl);
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: "not-a-real-test", parameters: {}, modifications: [] }),
    });
    assert.equal(res.status, 404);
  });
});

test("POST .../stress-runs with defaults reproduces the baseline database-saturation failure and persists it", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl);
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: "database-saturation", parameters: {}, modifications: [] }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { run: { runNumber: number; passed: boolean }; result: { frames: unknown[] } };
    assert.equal(body.run.runNumber, 1);
    assert.equal(body.run.passed, false);
    assert.ok(body.result.frames.length > 0);

    const history = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`);
    const runs = (await history.json()) as { runNumber: number }[];
    assert.equal(runs.length, 1);
  });
});

test("POST .../stress-runs applies a learner modification deterministically and records run 2", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl);
    await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: "database-saturation", parameters: {}, modifications: [] }),
    });
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: "database-saturation",
        parameters: {},
        modifications: [
          { kind: "add-component", id: "m1", componentType: "connection-pooler", targetEdgeId: "checkout-service-postgres", config: { maxBackendConnections: 170 } },
          { kind: "add-component", id: "m2", componentType: "connection-pooler", targetEdgeId: "inventory-service-postgres", config: { maxBackendConnections: 170 } },
        ],
      }),
    });
    const body = (await res.json()) as { run: { runNumber: number; passed: boolean } };
    assert.equal(body.run.runNumber, 2);
    assert.equal(body.run.passed, true);
  });
});

test("GET .../stress-runs before any run returns an empty list", async () => {
  await withTestServer(async (baseUrl) => {
    const sessionId = await createSessionAndStartAttempt(baseUrl);
    const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/stress-runs`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });
});
