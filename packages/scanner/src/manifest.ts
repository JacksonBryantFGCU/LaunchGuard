import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ManifestInfo, ScanWarning } from "@launchguard/shared";
import type { RepositoryInventory } from "./inventory.js";

interface RawPackageJson {
  name?: unknown;
  scripts?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  engines?: unknown;
  packageManager?: unknown;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") result[key] = val;
  }
  return result;
}

/**
 * Safely parses the repository's root package.json as JSON only (never imported/required).
 * Returns undefined when the project has no package.json at all.
 */
export async function inspectPackageManifest(
  root: string,
  inventory: RepositoryInventory,
  warnings: ScanWarning[],
): Promise<ManifestInfo | undefined> {
  const manifestFile = inventory.files.find((f) => f.relativePath === "package.json");
  if (!manifestFile) return undefined;

  let raw: string;
  try {
    raw = await readFile(path.join(root, "package.json"), "utf8");
  } catch {
    warnings.push({ code: "manifest-unreadable", message: "package.json could not be read." });
    return { scripts: {}, dependencies: {}, devDependencies: {}, engines: {}, parseError: "unreadable" };
  }

  let parsed: RawPackageJson;
  try {
    parsed = JSON.parse(raw) as RawPackageJson;
  } catch {
    warnings.push({ code: "manifest-malformed", message: "package.json is not valid JSON." });
    return { scripts: {}, dependencies: {}, devDependencies: {}, engines: {}, parseError: "invalid-json" };
  }

  return {
    name: typeof parsed.name === "string" ? parsed.name : undefined,
    scripts: asStringRecord(parsed.scripts),
    dependencies: asStringRecord(parsed.dependencies),
    devDependencies: asStringRecord(parsed.devDependencies),
    engines: asStringRecord(parsed.engines),
    packageManagerField: typeof parsed.packageManager === "string" ? parsed.packageManager : undefined,
  };
}
