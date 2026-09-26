import { test } from "node:test";
import assert from "node:assert/strict";
import { ArchitectureReviewSubmissionSchema, ArchitectureReviewResultSchema } from "./reviewSubmission.js";

function validSubmission() {
  return {
    scenarioSlug: "black-friday-checkout",
    reviewedNodeIds: ["checkout-service", "postgres"],
    reviewedEdgeIds: ["checkout-service-postgres"],
    redlines: [
      {
        id: "redline-1",
        targetType: "edge",
        targetId: "checkout-service-payment-provider",
        category: "reliability",
        severity: "high",
        title: "Missing external timeout",
        reasoning: "A provider degradation could hold checkout requests open indefinitely.",
        createdAt: new Date().toISOString(),
      },
    ],
    reviewerNotes: "Ask about failover plans.",
    recommendation: "request_redesign",
    finalRationale: "The architecture requires redesign before implementation given the risks noted above.",
  };
}

test("accepts a valid review submission", () => {
  assert.doesNotThrow(() => ArchitectureReviewSubmissionSchema.parse(validSubmission()));
});

test("accepts a submission with no voice evidence at all", () => {
  const submission = validSubmission();
  const parsed = ArchitectureReviewSubmissionSchema.parse(submission);
  assert.equal(parsed.architectConversationEvidence, undefined);
});

test("accepts a submission with valid architect conversation evidence", () => {
  const submission = {
    ...validSubmission(),
    architectConversationEvidence: {
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      turns: [
        {
          id: "turn-1",
          speaker: "reviewer",
          text: "Why is the payment call synchronous?",
          timestamp: new Date().toISOString(),
          final: true,
        },
        {
          id: "turn-2",
          speaker: "architect",
          text: "We wanted an authoritative result before creating the order.",
          timestamp: new Date().toISOString(),
          final: true,
        },
      ],
    },
  };
  assert.doesNotThrow(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("rejects conversation evidence with an invalid speaker", () => {
  const submission = {
    ...validSubmission(),
    architectConversationEvidence: {
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      turns: [{ id: "turn-1", speaker: "moderator", text: "hi", timestamp: new Date().toISOString(), final: true }],
    },
  };
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("rejects conversation evidence with an excessive turn count", () => {
  const turns = Array.from({ length: 301 }, (_, i) => ({
    id: `turn-${i}`,
    speaker: "reviewer" as const,
    text: "hi",
    timestamp: new Date().toISOString(),
    final: true,
  }));
  const submission = {
    ...validSubmission(),
    architectConversationEvidence: { conversationId: "conv-1", startedAt: new Date().toISOString(), turns },
  };
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("rejects conversation evidence with an excessive turn message length", () => {
  const submission = {
    ...validSubmission(),
    architectConversationEvidence: {
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      turns: [{ id: "turn-1", speaker: "reviewer", text: "x".repeat(4001), timestamp: new Date().toISOString(), final: true }],
    },
  };
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("strips provider-specific extra payloads from conversation evidence rather than accepting them", () => {
  const submission = {
    ...validSubmission(),
    architectConversationEvidence: {
      conversationId: "conv-1",
      startedAt: new Date().toISOString(),
      turns: [
        {
          id: "turn-1",
          speaker: "reviewer",
          text: "hi",
          timestamp: new Date().toISOString(),
          final: true,
          rawElevenLabsEvent: { anything: "goes here" },
        },
      ],
      rawProviderSessionPayload: { secret: "nope" },
    },
  };
  const parsed = ArchitectureReviewSubmissionSchema.parse(submission);
  assert.equal((parsed.architectConversationEvidence as Record<string, unknown>).rawProviderSessionPayload, undefined);
  assert.equal((parsed.architectConversationEvidence!.turns[0] as Record<string, unknown>).rawElevenLabsEvent, undefined);
});

test("rejects an invalid recommendation", () => {
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse({ ...validSubmission(), recommendation: "maybe" }));
});

test("rejects a submission containing an invalid redline", () => {
  const submission = validSubmission();
  submission.redlines[0]!.severity = "urgent" as never;
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("rejects a final rationale that is too short", () => {
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse({ ...validSubmission(), finalRationale: "too short" }));
});

test("rejects a final rationale that is too long", () => {
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse({ ...validSubmission(), finalRationale: "x".repeat(5001) }));
});

test("rejects malformed reviewed-node IDs", () => {
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse({ ...validSubmission(), reviewedNodeIds: [""] }));
});

test("rejects malformed reviewed-edge IDs", () => {
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse({ ...validSubmission(), reviewedEdgeIds: [123] }));
});

test("rejects more redlines than the bounded maximum", () => {
  const submission = validSubmission();
  submission.redlines = Array.from({ length: 101 }, (_, i) => ({ ...submission.redlines[0]!, id: `redline-${i}` }));
  assert.throws(() => ArchitectureReviewSubmissionSchema.parse(submission));
});

test("accepts a valid review result", () => {
  assert.doesNotThrow(() =>
    ArchitectureReviewResultSchema.parse({
      reviewId: "11111111-1111-4111-8111-111111111111",
      scenarioSlug: "black-friday-checkout",
      status: "submitted",
      submittedAt: new Date().toISOString(),
      recommendation: "approve",
      redlineCount: 1,
      reviewedNodeCount: 2,
      totalNodeCount: 10,
      reviewedEdgeCount: 1,
      totalEdgeCount: 10,
    }),
  );
});

test("rejects a review result with a non-submitted status", () => {
  assert.throws(() =>
    ArchitectureReviewResultSchema.parse({
      reviewId: "11111111-1111-4111-8111-111111111111",
      scenarioSlug: "black-friday-checkout",
      status: "pending",
      submittedAt: new Date().toISOString(),
      recommendation: "approve",
      redlineCount: 0,
      reviewedNodeCount: 0,
      totalNodeCount: 10,
      reviewedEdgeCount: 0,
      totalEdgeCount: 10,
    }),
  );
});
