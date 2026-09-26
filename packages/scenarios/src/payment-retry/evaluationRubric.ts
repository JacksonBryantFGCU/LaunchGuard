import type { EvaluationRubric } from "../internalDomain.js";

export const evaluationRubric: EvaluationRubric = {
  dimensions: [
    {
      id: "critical-issue-detection",
      label: "Critical issue detection",
      description: "Did the reviewer identify the duplicate-charge and duplicate-submission risks before approving?",
      weight: 0.3,
    },
    {
      id: "technical-reasoning",
      label: "Technical reasoning",
      description: "Did the reviewer reason correctly about retry safety, idempotency, and failure classification?",
      weight: 0.2,
    },
    {
      id: "evidence-quality",
      label: "Evidence quality",
      description: "Did comments cite specific lines/files rather than vague, generic concerns?",
      weight: 0.15,
    },
    {
      id: "questioning-quality",
      label: "Questioning quality",
      description: "Did the reviewer ask the developer targeted questions that would surface the hidden risks?",
      weight: 0.15,
    },
    {
      id: "production-awareness",
      label: "Production awareness",
      description: "Did the reviewer consider request latency, observability, and provider-outage behavior?",
      weight: 0.1,
    },
    {
      id: "review-communication",
      label: "Review communication",
      description: "Were review comments clear, specific, and actionable?",
      weight: 0.05,
    },
    {
      id: "final-decision-appropriateness",
      label: "Final decision appropriateness",
      description: "Was the final review decision consistent with the severity of what was found?",
      weight: 0.05,
    },
  ],
};
