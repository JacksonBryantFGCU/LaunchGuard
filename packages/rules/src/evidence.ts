import { SERVER_FRAMEWORKS, type RepositoryAnalysis } from "@launchguard/shared";

/** Shared applicability checks so individual rules stay declarative. */
export function hasServerFramework(analysis: RepositoryAnalysis): boolean {
  return analysis.project.frameworks.some((f) => SERVER_FRAMEWORKS.has(f));
}

export function hasBundlerLikeFramework(analysis: RepositoryAnalysis): boolean {
  const bundlerFrameworks = new Set(["Vite", "Next.js", "React", "Vue", "Angular", "Svelte", "SvelteKit"]);
  return analysis.project.frameworks.some((f) => bundlerFrameworks.has(f));
}

export function usesTypeScript(analysis: RepositoryAnalysis): boolean {
  return analysis.project.languages.includes("TypeScript");
}

export function hasConfigKind(analysis: RepositoryAnalysis, kind: string): boolean {
  return analysis.configuration.some((c) => c.kind === kind);
}

export function hasFilePathContaining(analysis: RepositoryAnalysis, needle: string): boolean {
  const lowered = needle.toLowerCase();
  return analysis.files.some((f) => f.toLowerCase().includes(lowered));
}
