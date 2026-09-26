import { opendir } from "node:fs/promises";
import path from "node:path";
import type { ScanWarning } from "@launchguard/shared";
import { IGNORED_DIR_NAMES, SCAN_LIMITS } from "./limits.js";
import { RepositoryTooLargeError } from "./errors.js";

export interface InventoryFile {
  /** Repository-relative path using forward slashes. */
  relativePath: string;
  absolutePath: string;
}

export interface RepositoryInventory {
  files: InventoryFile[];
  filesSeen: number;
  truncated: boolean;
}

function toRelativePosix(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

/**
 * Walks the repository tree, skipping ignored directories and symlinks entirely
 * (never followed, in or out of the tree) so a scan cannot escape the clone root.
 */
export async function inventoryRepository(root: string, warnings: ScanWarning[]): Promise<RepositoryInventory> {
  const files: InventoryFile[] = [];
  let filesSeen = 0;
  let truncated = false;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > SCAN_LIMITS.maxTraversalDepth) {
      truncated = true;
      warnings.push({ code: "max-depth-exceeded", message: `Traversal depth limit reached at ${toRelativePosix(root, dir)}` });
      return;
    }

    const entries = await opendir(dir);
    for await (const entry of entries) {
      filesSeen++;
      if (filesSeen > SCAN_LIMITS.hardStopEntries) {
        throw new RepositoryTooLargeError();
      }

      // Never follow symlinks, in either direction.
      if (entry.isSymbolicLink()) continue;

      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) continue;
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      if (files.length >= SCAN_LIMITS.maxFilesAnalyzed) {
        truncated = true;
        continue;
      }

      files.push({ relativePath: toRelativePosix(root, absolutePath), absolutePath });
    }
  }

  await walk(root, 0);

  return { files, filesSeen, truncated };
}
