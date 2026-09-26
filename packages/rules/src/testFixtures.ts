import type { RepositoryAnalysis } from "@launchguard/shared";

/** A minimal, fully-populated RepositoryAnalysis for rule unit tests. Override fields per test. */
export function baseAnalysis(overrides: Partial<RepositoryAnalysis> = {}): RepositoryAnalysis {
  return {
    repository: { owner: "acme", name: "widget", url: "https://github.com/acme/widget" },
    project: {
      languages: [],
      frameworks: [],
      packageManager: "unknown",
      isNodeProject: false,
    },
    files: [],
    manifest: undefined,
    configuration: [],
    potentialSecrets: [],
    signals: { corsWildcardFiles: [] },
    statistics: { filesSeen: 0, filesAnalyzed: 0, truncated: false },
    warnings: [],
    ...overrides,
  };
}
