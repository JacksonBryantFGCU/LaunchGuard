import type { HiddenTest } from "../internalDomain.js";

export const hiddenTests: HiddenTest[] = [
  {
    id: "normal-checkout",
    name: "Normal checkout succeeds on the first attempt",
    status: "pass",
    revealsIssueIds: [],
    expected: "A single payment intent is created and a 201 is returned.",
    observed: "A single payment intent is created and a 201 is returned.",
    explanation: "The happy path is unaffected by the retry logic and behaves correctly.",
  },
  {
    id: "stripe-500-then-success",
    name: "Stripe returns a 500 once, then succeeds on retry",
    status: "pass",
    revealsIssueIds: ["retry-broad-error-classification", "linear-backoff-no-jitter"],
    expected: "The request eventually succeeds after one retry.",
    observed: "The request succeeds on the second attempt after a 1000ms backoff.",
    explanation:
      "This case passes functionally, but only because the transient failure happened to be retryable; the policy would retry identically for a non-transient error.",
  },
  {
    id: "stripe-timeout-exhausts-retries",
    name: "Stripe hangs past a reasonable deadline on every attempt",
    status: "fail",
    revealsIssueIds: ["missing-request-timeout", "synchronous-retry-latency"],
    expected: "The checkout request fails fast with a clear timeout error well under 10 seconds.",
    observed: "The request hangs for the provider's full default timeout on each of 3 attempts plus backoff.",
    explanation: "With no explicit timeout, a slow provider response is retried three times with no early exit, producing very high tail latency.",
  },
  {
    id: "duplicate-retry-creates-second-charge",
    name: "First attempt succeeds server-side but the response is lost, triggering a retry",
    status: "fail",
    revealsIssueIds: ["duplicate-payment-charges"],
    expected: "Exactly one payment intent exists for the order.",
    observed: "Two separate payment intents are created for the same order.",
    explanation: "Without an idempotency key, a retry after a lost response creates a duplicate charge instead of returning the original result.",
  },
  {
    id: "double-submit-checkout-button",
    name: "The checkout endpoint receives two near-simultaneous requests for the same order",
    status: "fail",
    revealsIssueIds: ["duplicate-checkout-submission", "duplicate-payment-charges"],
    expected: "The second submission is rejected or returns the result of the first.",
    observed: "Both requests proceed independently and can both succeed, charging the customer twice.",
    explanation: "There is no in-flight or idempotency guard keyed on orderId, so concurrent submissions are not deduplicated.",
  },
  {
    id: "stripe-429-rate-limited",
    name: "Stripe returns 429 rate-limit errors on every attempt",
    status: "fail",
    revealsIssueIds: ["retry-broad-error-classification", "linear-backoff-no-jitter"],
    expected: "Retries back off enough, and with enough randomization, to avoid compounding the rate limit across concurrent checkouts.",
    observed: "All retries use the same fixed linear delay, so concurrent requests retry in lockstep and keep hitting the rate limit together.",
    explanation: "The lack of jitter means many simultaneous callers retry at the same moments, amplifying load instead of spreading it out.",
  },
];
