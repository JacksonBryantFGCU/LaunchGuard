import type { ConfigFileInfo } from "@launchguard/shared";
import type { RepositoryInventory } from "./inventory.js";

interface ConfigMatcher {
  kind: string;
  test: (relativePath: string) => boolean;
}

const MATCHERS: ConfigMatcher[] = [
  { kind: "env-example", test: (p) => p === ".env.example" || p === ".env.sample" },
  { kind: "env-file", test: (p) => p === ".env" },
  { kind: "gitignore", test: (p) => p === ".gitignore" },
  { kind: "dockerfile", test: (p) => /(^|\/)Dockerfile$/i.test(p) },
  { kind: "docker-compose", test: (p) => /^(docker-)?compose\.ya?ml$/i.test(p) },
  { kind: "vite-config", test: (p) => /^vite\.config\.(ts|js|mjs|cjs)$/.test(p) },
  { kind: "next-config", test: (p) => /^next\.config\.(ts|js|mjs|cjs)$/.test(p) },
  { kind: "tsconfig", test: (p) => p === "tsconfig.json" },
  { kind: "eslint-config", test: (p) => /^\.eslintrc(\.[jc]s|\.json|\.ya?ml)?$/.test(p) || /^eslint\.config\.(ts|js|mjs|cjs)$/.test(p) },
  { kind: "prettier-config", test: (p) => /^\.prettierrc(\.[jc]s|\.json|\.ya?ml)?$/.test(p) || /^prettier\.config\.(ts|js|mjs|cjs)$/.test(p) },
  { kind: "vercel-config", test: (p) => p === "vercel.json" },
  { kind: "netlify-config", test: (p) => p === "netlify.toml" },
  { kind: "render-config", test: (p) => p === "render.yaml" },
  { kind: "github-workflow", test: (p) => /^\.github\/workflows\/.+\.ya?ml$/.test(p) },
  { kind: "lockfile-npm", test: (p) => p === "package-lock.json" },
  { kind: "lockfile-pnpm", test: (p) => p === "pnpm-lock.yaml" },
  { kind: "lockfile-yarn", test: (p) => p === "yarn.lock" },
  { kind: "lockfile-bun", test: (p) => p === "bun.lockb" || p === "bun.lock" },
];

export function detectConfiguration(inventory: RepositoryInventory): ConfigFileInfo[] {
  const found: ConfigFileInfo[] = [];
  for (const file of inventory.files) {
    for (const matcher of MATCHERS) {
      if (matcher.test(file.relativePath)) {
        found.push({ path: file.relativePath, kind: matcher.kind });
      }
    }
  }
  return found;
}
