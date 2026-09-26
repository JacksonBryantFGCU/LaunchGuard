import type { ConfigFileInfo, ManifestInfo, PackageManager, ProjectInfo } from "@launchguard/shared";
import type { RepositoryInventory } from "./inventory.js";

const EXTENSION_LANGUAGES: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".cs": "C#",
  ".go": "Go",
  ".rs": "Rust",
};

const FRAMEWORK_DEPENDENCY_MARKERS: [string, string][] = [
  ["react", "React"],
  ["vite", "Vite"],
  ["next", "Next.js"],
  ["express", "Express"],
  ["@nestjs/core", "NestJS"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["svelte", "Svelte"],
  ["@sveltejs/kit", "SvelteKit"],
];

function detectLanguages(inventory: RepositoryInventory): string[] {
  const counts = new Map<string, number>();
  for (const file of inventory.files) {
    const dot = file.relativePath.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = file.relativePath.slice(dot).toLowerCase();
    const language = EXTENSION_LANGUAGES[ext];
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([language]) => language);
}

function detectFrameworks(manifest: ManifestInfo | undefined, configuration: ConfigFileInfo[]): string[] {
  const frameworks = new Set<string>();
  const allDeps = { ...manifest?.dependencies, ...manifest?.devDependencies };
  for (const [dependency, framework] of FRAMEWORK_DEPENDENCY_MARKERS) {
    if (dependency in allDeps) frameworks.add(framework);
  }
  if (configuration.some((c) => c.kind === "vite-config")) frameworks.add("Vite");
  if (configuration.some((c) => c.kind === "next-config")) frameworks.add("Next.js");
  return [...frameworks];
}

function detectPackageManager(manifest: ManifestInfo | undefined, configuration: ConfigFileInfo[]): PackageManager {
  if (manifest?.packageManagerField) {
    const name = manifest.packageManagerField.split("@")[0];
    if (name === "pnpm" || name === "yarn" || name === "npm" || name === "bun") return name;
  }
  const kinds = new Set(configuration.map((c) => c.kind));
  if (kinds.has("lockfile-pnpm")) return "pnpm";
  if (kinds.has("lockfile-yarn")) return "yarn";
  if (kinds.has("lockfile-bun")) return "bun";
  if (kinds.has("lockfile-npm")) return "npm";
  return "unknown";
}

export function detectProject(
  inventory: RepositoryInventory,
  manifest: ManifestInfo | undefined,
  configuration: ConfigFileInfo[],
): ProjectInfo {
  return {
    languages: detectLanguages(inventory),
    frameworks: detectFrameworks(manifest, configuration),
    packageManager: detectPackageManager(manifest, configuration),
    isNodeProject: manifest !== undefined,
  };
}
