import type { HiddenIssue } from "../internalDomain.js";

export const hiddenIssues: HiddenIssue[] = [
  {
    id: "duplicate-payment-charges",
    title: "No idempotency key across retry attempts",
    category: "data-integrity",
    severity: "critical",
    description:
      "createPayment() calls stripe.paymentIntents.create() again on every retry without an idempotency key. If the first attempt actually succeeded on Stripe's side but the response was lost (timeout, network blip), the retry creates a second, separate payment intent for the same order.",
    affectedFile: "src/payments/paymentService.ts",
    affectedLines: { start: 23, end: 28 },
    evidence: "The retry loop calls stripe.paymentIntents.create with no idempotencyKey option.",
    expectedReviewerInsight:
      "A strong reviewer should ask how a duplicate charge is prevented when a request succeeds but the response never reaches the client.",
  },
  {
    id: "retry-broad-error-classification",
    title: "Retries treat all errors as transient",
    category: "reliability",
    severity: "high",
    description:
      "shouldRetry() unconditionally returns true. Validation errors, declined cards, and other permanent failures get retried exactly like transient network errors, wasting attempts and delaying a response the client could have received immediately.",
    affectedFile: "src/payments/retryPolicy.ts",
    affectedLines: { start: 4, end: 7 },
    evidence: "shouldRetry ignores the error argument entirely and always returns true.",
    expectedReviewerInsight:
      "A strong reviewer should question why the retry decision doesn't distinguish retryable failures (timeouts, 5xx, rate limits) from non-retryable ones (card declined, validation errors).",
  },
  {
    id: "missing-request-timeout",
    title: "No explicit timeout on the payment provider call",
    category: "reliability",
    severity: "high",
    description:
      "Neither the Stripe call nor the retry loop enforces a timeout or overall time budget. A slow provider response can hang the request far longer than three attempts would suggest.",
    affectedFile: "src/payments/paymentService.ts",
    affectedLines: { start: 21, end: 42 },
    evidence: "stripe.paymentIntents.create is awaited with no timeout, AbortController, or overall deadline.",
    expectedReviewerInsight:
      "A strong reviewer should flag the lack of a per-attempt or overall timeout budget for the payment call.",
  },
  {
    id: "synchronous-retry-latency",
    title: "Retries block the checkout request lifecycle",
    category: "performance",
    severity: "medium",
    description:
      "All retry attempts, including backoff sleeps, happen synchronously inside the HTTP request/response cycle. In the worst case the client waits roughly 1s + 2s = 3s of backoff on top of three provider round trips before getting any response.",
    affectedFile: "src/routes/checkout.ts",
    affectedLines: { start: 7, end: 13 },
    evidence: "handleCheckout awaits createPayment directly, and createPayment's retry loop sleeps in-process before returning.",
    expectedReviewerInsight:
      "A strong reviewer should notice that retry latency is fully exposed to the caller instead of being handled asynchronously or with a faster user-facing response.",
  },
  {
    id: "linear-backoff-no-jitter",
    title: "Backoff is linear with no jitter",
    category: "reliability",
    severity: "low",
    description:
      "nextBackoffMs() grows linearly (1000ms, 2000ms) with no randomization. Under a real provider outage, many concurrent checkout requests retry in lockstep, which can amplify load on the provider right as it starts recovering.",
    affectedFile: "src/payments/retryPolicy.ts",
    affectedLines: { start: 9, end: 11 },
    evidence: "nextBackoffMs is a pure linear function of attempt number with no random jitter term.",
    expectedReviewerInsight:
      "A strong reviewer should raise the lack of jitter as a concern for retry storms during a provider-wide incident.",
  },
  {
    id: "insufficient-retry-logging",
    title: "Logging lacks attempt/context detail",
    category: "maintainability",
    severity: "medium",
    description:
      "The success log includes the attempt number, but the failure log on the final attempt does not include the underlying error message or code, only orderId and attempt. Diagnosing why retries were exhausted after the fact is harder than it needs to be.",
    affectedFile: "src/payments/paymentService.ts",
    affectedLines: { start: 36, end: 38 },
    evidence: "logger.error({ orderId: input.orderId, attempt }, ...) does not include the caught error.",
    expectedReviewerInsight:
      "A strong reviewer should ask for the error itself (message/code) to be included in the failure log line.",
  },
  {
    id: "duplicate-checkout-submission",
    title: "No protection against duplicate checkout submissions",
    category: "concurrency",
    severity: "high",
    description:
      "handleCheckout has no request-level deduplication (e.g. a client-supplied idempotency key or in-flight request guard keyed on orderId). A double-clicked checkout button or a client-side retry after a slow response can trigger two independent calls into createPayment for the same order.",
    affectedFile: "src/routes/checkout.ts",
    affectedLines: { start: 5, end: 14 },
    evidence: "handleCheckout reads orderId from the request body but never uses it to detect or reject a duplicate in-flight submission.",
    expectedReviewerInsight:
      "A strong reviewer should connect this with the missing idempotency key and ask how two submissions for the same order are prevented from both succeeding.",
  },
];
