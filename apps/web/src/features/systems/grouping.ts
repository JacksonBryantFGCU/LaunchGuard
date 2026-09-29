import type { SystemSummary, SystemSourceType } from "@purgatory/shared";

export function groupSystems(systems: SystemSummary[]): { samples: SystemSummary[]; owned: SystemSummary[] } {
  return {
    samples: systems.filter((s) => s.sourceType === "sample"),
    owned: systems.filter((s) => s.sourceType === "manual"),
  };
}

export function sourceLabel(sourceType: SystemSourceType): string {
  return sourceType === "sample" ? "Sample" : "Private";
}

export function isSystemEmpty(system: SystemSummary): boolean {
  return system.componentCount === 0 && system.scenarioCount === 0;
}

export const workspaceTabs = ["overview", "architecture", "requirements", "scenarios", "simulations", "findings"] as const;
export type WorkspaceTab = (typeof workspaceTabs)[number];
