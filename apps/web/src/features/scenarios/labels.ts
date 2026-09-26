import type { CiStatus, ScenarioCategory, ScenarioDifficulty } from "@redline/shared";

export const DIFFICULTY_LABELS: Record<ScenarioDifficulty, string> = {
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
};

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  reliability: "Reliability",
  "data-integrity": "Data Integrity",
  security: "Security",
  performance: "Performance",
  architecture: "Architecture",
};

export const CI_STATUS_LABELS: Record<CiStatus, string> = {
  passing: "CI Passing",
  failing: "CI Failing",
  pending: "CI Pending",
};

export const CI_STATUS_TONE: Record<CiStatus, "success" | "danger" | "warning"> = {
  passing: "success",
  failing: "danger",
  pending: "warning",
};
