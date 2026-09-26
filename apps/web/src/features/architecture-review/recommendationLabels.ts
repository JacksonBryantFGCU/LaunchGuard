import type { ArchitectureRecommendation } from "@redline/shared";

export const RECOMMENDATION_ORDER: ArchitectureRecommendation[] = [
  "approve",
  "approve_with_conditions",
  "request_redesign",
  "block_release",
];

export const RECOMMENDATION_LABELS: Record<ArchitectureRecommendation, string> = {
  approve: "Approve",
  approve_with_conditions: "Approve with Conditions",
  request_redesign: "Request Redesign",
  block_release: "Block Release",
};

// Neutral descriptions - never hint which choice fits this scenario.
export const RECOMMENDATION_DESCRIPTIONS: Record<ArchitectureRecommendation, string> = {
  approve: "The architecture is ready to proceed as proposed.",
  approve_with_conditions:
    "The architecture may proceed if specific concerns are resolved during implementation or before release.",
  request_redesign: "Material architectural changes are required before implementation should proceed.",
  block_release: "The architecture contains severe production risk and should not proceed without substantial correction.",
};
