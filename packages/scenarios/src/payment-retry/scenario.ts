import { InternalReviewScenarioSchema, type InternalReviewScenario } from "../internalDomain.js";
import * as paymentService from "./files/paymentService.js";
import * as retryPolicy from "./files/retryPolicy.js";
import * as checkout from "./files/checkout.js";
import { hiddenIssues } from "./hiddenIssues.js";
import { hiddenTests } from "./hiddenTests.js";
import { developerPersona } from "./developerPersona.js";
import { evaluationRubric } from "./evaluationRubric.js";

export const paymentRetryScenario: InternalReviewScenario = InternalReviewScenarioSchema.parse({
  id: "payment-retry",
  slug: "payment-retry",
  title: "Payment Retry",
  description:
    "Review a payment retry implementation and determine whether the change is safe for production.",
  difficulty: "mid",
  categories: ["reliability", "data-integrity"],
  pullRequest: {
    number: 142,
    title: "Add payment retry logic",
    description:
      "Introduces automatic retry handling for failed payment charges, including a backoff policy and checkout route wiring.",
    author: "Alex Chen",
    sourceBranch: "feature/payment-retries",
    targetBranch: "main",
    ciStatus: "passing",
    additions: 49,
    deletions: 13,
  },
  files: [
    {
      path: "src/payments/paymentService.ts",
      status: "modified",
      language: "typescript",
      additions: 34,
      deletions: 12,
      oldContent: paymentService.oldContent,
      newContent: paymentService.newContent,
    },
    {
      path: "src/payments/retryPolicy.ts",
      status: "added",
      language: "typescript",
      additions: 12,
      deletions: 0,
      oldContent: retryPolicy.oldContent,
      newContent: retryPolicy.newContent,
    },
    {
      path: "src/routes/checkout.ts",
      status: "modified",
      language: "typescript",
      additions: 3,
      deletions: 1,
      oldContent: checkout.oldContent,
      newContent: checkout.newContent,
    },
  ],
  developerPersona,
  hiddenIssues,
  hiddenTests,
  evaluationRubric,
});
