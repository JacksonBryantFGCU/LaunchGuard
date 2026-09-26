import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { simpleGit } from "simple-git";
import { RepositoryScanError } from "../../errors.js";
import { logger } from "../../logger.js";

const CLONE_TIMEOUT_MS = 20_000;

export interface ClonedRepository {
  /** Local filesystem root of the shallow clone. Never expose this path to clients. */
  root: string;
  /** Always safe to call more than once; failures are logged, never thrown. */
  cleanup: () => Promise<void>;
}

function translateCloneError(err: unknown): RepositoryScanError {
  if (err instanceof RepositoryScanError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return new RepositoryScanError("REPOSITORY_CLONE_TIMEOUT", "Cloning the repository took too long.");
  }
  if (lower.includes("not found") || lower.includes("does not exist") || lower.includes("repository not found")) {
    return new RepositoryScanError("REPOSITORY_NOT_FOUND", "The repository could not be found.");
  }
  if (
    lower.includes("could not read username") ||
    lower.includes("authentication failed") ||
    lower.includes("terminal prompts disabled") ||
    lower.includes("permission denied")
  ) {
    return new RepositoryScanError("REPOSITORY_ACCESS_DENIED", "The repository is private or inaccessible.");
  }
  if (lower.includes("enoent") || lower.includes("not recognized") || lower.includes("git is not installed")) {
    return new RepositoryScanError("GIT_UNAVAILABLE", "The repository acquisition service is temporarily unavailable.");
  }

  return new RepositoryScanError("REPOSITORY_SCAN_FAILED", "The repository could not be cloned.");
}

/**
 * Shallow-clones a repository into an application-controlled temp directory with a
 * generated name (never a user-supplied path). Callers must always invoke `cleanup`,
 * including on failure paths after acquisition.
 */
export async function cloneRepository(cloneUrl: string): Promise<ClonedRepository> {
  const root = await mkdtemp(path.join(tmpdir(), "launchguard-scan-"));

  const cleanup = async () => {
    try {
      await rm(root, { recursive: true, force: true });
    } catch (err) {
      logger.error({ err }, "failed to clean up temporary repository clone");
    }
  };

  try {
    const git = simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } });
    await Promise.race([
      git.clone(cloneUrl, root, ["--depth", "1", "--single-branch", "--no-tags"]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("clone timed out")), CLONE_TIMEOUT_MS)),
    ]);
    return { root, cleanup };
  } catch (err) {
    await cleanup();
    throw translateCloneError(err);
  }
}
