import { test } from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "../testUtils.js";
import { InMemoryReviewRepository } from "../services/reviewRepository.js";
import { InMemoryPracticeScenarioRepository } from "../services/practiceScenarioRepository.js";

const SCENARIO_ID = "checkout-latency-spike";

async function createReviewSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/review-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioSlug: "black-friday-checkout" }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

test("POST .../:scenarioId/start creates an attempt", async () => {
  await withTestServer(
    async (baseUrl) => {
      const sessionId = await createReviewSession(baseUrl);
      const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/start`, {
        method: "POST",
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.practiceScenarioId, SCENARIO_ID);
      assert.equal(body.status, "investigating");
    },
    { practiceRepository: new InMemoryPracticeScenarioRepository() },
  );
});

test("full practice scenario lifecycle: start, draft, requirements, evidence, submit, consequence, complete", async () => {
  const repository = new InMemoryReviewRepository();
  const practiceRepository = new InMemoryPracticeScenarioRepository();

  await withTestServer(
    async (baseUrl) => {
      const sessionId = await createReviewSession(baseUrl);

      const start = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/start`, {
        method: "POST",
      });
      assert.equal(start.status, 200);

      const draft = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: "Database contention",
          investigationPlan: "Check connections",
          immediateAction: "Add pooling",
          architectureDecision: "Add a pooler",
          tradeoff: "More complexity",
          severity: "medium",
        }),
      });
      assert.equal(draft.status, 200);
      const draftBody = (await draft.json()) as { response: { diagnosis: string } };
      assert.equal(draftBody.response.diagnosis, "Database contention");

      const requirements = await fetch(
        `${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/requirements`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirementIds: ["req-latency"] }),
        },
      );
      assert.equal(requirements.status, 200);

      const evidence = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "scenario_evidence", sourceId: "ev-db-connections", label: "l", content: "c" }),
      });
      assert.equal(evidence.status, 200);
      const evidenceBody = (await evidence.json()) as { evidence: { id: string }[] };
      const evidenceId = evidenceBody.evidence[0]!.id;

      const responseEvidence = await fetch(
        `${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/response-evidence`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidenceIds: [evidenceId] }),
        },
      );
      assert.equal(responseEvidence.status, 200);

      const submit = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/submit`, {
        method: "POST",
      });
      assert.equal(submit.status, 200);
      const submitBody = (await submit.json()) as { attempt: { status: string }; evaluation: { objectiveScore: number } };
      assert.equal(submitBody.attempt.status, "feedback_ready");
      assert.ok(submitBody.evaluation.objectiveScore >= 0);

      const consequence = await fetch(
        `${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/consequence-ready`,
        { method: "POST" },
      );
      assert.equal(consequence.status, 200);

      const complete = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/complete`, {
        method: "POST",
      });
      assert.equal(complete.status, 200);
      const completeBody = (await complete.json()) as { status: string };
      assert.equal(completeBody.status, "completed");

      const list = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios`);
      assert.equal(list.status, 200);
      const listBody = (await list.json()) as { practiceScenarioId: string; status: string }[];
      assert.equal(listBody.length, 1);
      assert.equal(listBody[0]?.status, "completed");

      const removeEvidence = await fetch(
        `${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/evidence/${evidenceId}`,
        { method: "DELETE" },
      );
      // Locked after submission - deletion is rejected, not silently ignored.
      assert.equal(removeEvidence.status, 409);
    },
    { repository, practiceRepository },
  );
});

test("a different user cannot start or view another user's practice attempt", async () => {
  const repository = new InMemoryReviewRepository();
  const practiceRepository = new InMemoryPracticeScenarioRepository();
  const sessionId = await withTestServer(
    async (baseUrl) => createReviewSession(baseUrl),
    { userId: "user_a", repository, practiceRepository },
  );

  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions/${sessionId}/practice-scenarios/${SCENARIO_ID}/start`, {
        method: "POST",
      });
      assert.equal(res.status, 403);
    },
    { userId: "user_b", repository, practiceRepository },
  );
});

test("rejects an unauthenticated request with 401", async () => {
  await withTestServer(
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/review-sessions/whatever/practice-scenarios/${SCENARIO_ID}/start`, {
        method: "POST",
      });
      assert.equal(res.status, 401);
    },
    { userId: null },
  );
});
