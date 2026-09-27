import type { PracticeScenarioStatus } from "@purgatory/shared";

export const RESOURCE_TABS = ["overview", "metrics", "requirements", "architecture", "stress-lab", "architect", "response"] as const;
export type ResourceTab = (typeof RESOURCE_TABS)[number];

/** Falls back to "overview" for anything not a known tab - never throws on a bad URL param. */
export function resolveResourceTab(value: string | null | undefined): ResourceTab {
  return (RESOURCE_TABS as readonly string[]).includes(value ?? "") ? (value as ResourceTab) : "overview";
}

/** The response/requirements/evidence become read-only once submitted. */
export function isResponseLocked(status: PracticeScenarioStatus): boolean {
  return status !== "investigating";
}

/** The result screen only has anything to show once a submission exists. */
export function canOpenResult(status: PracticeScenarioStatus): boolean {
  return status !== "investigating";
}

/** The consequence/stress reveal needs a saved evaluation result first. */
export function canOpenConsequence(status: PracticeScenarioStatus): boolean {
  return status === "feedback_ready" || status === "consequence_ready" || status === "completed";
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";
export type AutosaveEvent = "start" | "success" | "failure";

/** "retry" is just calling start() again from an error state - no special case needed. */
export function nextAutosaveStatus(_current: AutosaveStatus, event: AutosaveEvent): AutosaveStatus {
  if (event === "start") return "saving";
  if (event === "success") return "saved";
  return "error";
}
