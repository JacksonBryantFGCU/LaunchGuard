import type { DeveloperPersona } from "../internalDomain.js";

export const developerPersona: DeveloperPersona = {
  name: "Alex Chen",
  role: "Backend engineer, checkout team",
  behavior: "confident but cooperative",
  summary:
    "Alex shipped this retry logic after a support escalation about checkout failures during a brief Stripe blip last month. Alex believes retrying is a clear reliability win and is happy to walk through the reasoning, but hasn't deeply considered duplicate-charge or timeout edge cases.",
  rationale: [
    "Keeping the retries synchronous means the client gets an immediate, final result instead of having to poll for a pending status.",
    "Three attempts seemed like a reasonable, conservative improvement over failing on the first error.",
    "A simple fixed backoff keeps the implementation easy to read and reason about compared to a more complex retry library.",
    "Payment-provider failures were assumed to be mostly transient blips, similar to what triggered the original support escalation.",
    "Splitting the retry math into its own retryPolicy module felt like good separation from the Stripe call itself.",
  ],
  knownImplementationFacts: [
    "The retry loop lives entirely inside createPayment in paymentService.ts.",
    "shouldRetry currently retries on any thrown error.",
    "Backoff is 1000ms times the attempt number, with no randomization.",
    "checkout.ts calls createPayment directly and awaits the final result before responding.",
    "There is no idempotency key passed to Stripe on any attempt.",
  ],
};
