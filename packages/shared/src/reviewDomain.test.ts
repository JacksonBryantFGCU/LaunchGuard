import { test } from "node:test";
import assert from "node:assert/strict";
import { ReviewSubmissionSchema } from "./reviewDomain.js";

function validSubmission() {
  return {
    scenarioSlug: "payment-retry",
    reviewedFiles: ["src/payments/paymentService.ts"],
    comments: [
      { id: "1", file: "src/payments/paymentService.ts", startLine: 10, endLine: 12, body: "No idempotency key here." },
    ],
    reviewerNotes: "Looking into retry safety.",
    decision: "request_changes",
    finalExplanation: "Retries can duplicate a charge because no idempotency key is reused.",
  };
}

test("accepts a valid review submission", () => {
  const result = ReviewSubmissionSchema.parse(validSubmission());
  assert.equal(result.decision, "request_changes");
});

test("rejects an invalid decision", () => {
  assert.throws(() => ReviewSubmissionSchema.parse({ ...validSubmission(), decision: "reject" }));
});

test("rejects an empty comment body", () => {
  const submission = validSubmission();
  submission.comments[0].body = "";
  assert.throws(() => ReviewSubmissionSchema.parse(submission));
});

test("rejects an invalid line range", () => {
  const submission = validSubmission();
  submission.comments[0].endLine = 5;
  submission.comments[0].startLine = 10;
  assert.throws(() => ReviewSubmissionSchema.parse(submission));
});

test("rejects a final explanation that is too short", () => {
  assert.throws(() => ReviewSubmissionSchema.parse({ ...validSubmission(), finalExplanation: "too short" }));
});

test("rejects a final explanation that is too long", () => {
  assert.throws(() => ReviewSubmissionSchema.parse({ ...validSubmission(), finalExplanation: "x".repeat(5000) }));
});

test("rejects a malformed reviewed-file list", () => {
  const submission = validSubmission();
  assert.throws(() => ReviewSubmissionSchema.parse({ ...submission, reviewedFiles: [123] }));
});

test("defaults reviewer notes to an empty string when omitted", () => {
  const submission: Record<string, unknown> = validSubmission();
  delete submission.reviewerNotes;
  const result = ReviewSubmissionSchema.parse(submission);
  assert.equal(result.reviewerNotes, "");
});

test("defaults transcript to an empty array when omitted", () => {
  const result = ReviewSubmissionSchema.parse(validSubmission());
  assert.deepEqual(result.transcript, []);
});

test("accepts a valid transcript", () => {
  const result = ReviewSubmissionSchema.parse({
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
  });
  assert.equal(result.transcript.length, 2);
});

test("rejects a transcript entry with an invalid speaker", () => {
  assert.throws(() =>
    ReviewSubmissionSchema.parse({
      ...validSubmission(),
      transcript: [{ id: "t1", speaker: "ai", text: "hi", timestamp: new Date().toISOString(), final: true }],
    }),
  );
});

test("rejects an oversized transcript", () => {
  const transcript = Array.from({ length: 501 }, (_, i) => ({
    id: `t${i}`,
    speaker: "reviewer" as const,
    text: "hi",
    timestamp: new Date().toISOString(),
    final: true as const,
  }));
  assert.throws(() => ReviewSubmissionSchema.parse({ ...validSubmission(), transcript }));
});

test("rejects a raw provider-shaped transcript object", () => {
  assert.throws(() =>
    ReviewSubmissionSchema.parse({
      ...validSubmission(),
      transcript: [{ message: "hi", source: "user" }],
    }),
  );
});
