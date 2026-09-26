import type { ReviewDecision } from "@redline/shared";

export const REVIEW_DECISIONS: ReviewDecision[] = ["approve", "comment", "request_changes", "block_release"];

export const DECISION_LABELS: Record<ReviewDecision, string> = {
  approve: "Approve",
  comment: "Comment",
  request_changes: "Request Changes",
  block_release: "Block Release",
};

export const DECISION_DESCRIPTIONS: Record<ReviewDecision, string> = {
  approve: "The change is ready to merge.",
  comment: "Leave non-blocking feedback without requesting changes.",
  request_changes: "Changes should be made before this PR is merged.",
  block_release: "The implementation presents a serious production/release risk.",
};
