import type { RepositoryAnalysis, RepositoryInfo, ScanWarning } from "@launchguard/shared";
import { inventoryRepository } from "./inventory.js";
import { inspectPackageManifest } from "./manifest.js";
import { detectConfiguration } from "./configuration.js";
import { detectProject } from "./detectProject.js";
import { inspectTextContents } from "./textInspection.js";

export { RepositoryTooLargeError } from "./errors.js";
export { SCAN_LIMITS } from "./limits.js";

/**
 * Statically inspects an already-acquired repository checkout at `root`.
 * Never executes, imports, or requires anything found in the repository.
 */
export async function scanRepository(root: string, repository: RepositoryInfo): Promise<RepositoryAnalysis> {
  const warnings: ScanWarning[] = [];

  const inventory = await inventoryRepository(root, warnings);
  const manifest = await inspectPackageManifest(root, inventory, warnings);
  const configuration = detectConfiguration(inventory);
  const project = detectProject(inventory, manifest, configuration);
  const { potentialSecrets, signals } = await inspectTextContents(inventory, warnings);

  if (inventory.truncated) {
    warnings.push({ code: "inventory-truncated", message: "Repository inventory was truncated by scan safety limits." });
  }

  return {
    repository,
    project,
    files: inventory.files.map((f) => f.relativePath),
    manifest,
    configuration,
    potentialSecrets,
    signals,
    statistics: {
      filesSeen: inventory.filesSeen,
      filesAnalyzed: inventory.files.length,
      truncated: inventory.truncated,
    },
    warnings,
  };
}
