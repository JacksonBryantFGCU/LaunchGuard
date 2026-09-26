import { allRules, runRules } from "@launchguard/rules";
import { buildScanResult } from "@launchguard/report";
import { scanRepository, RepositoryTooLargeError } from "@launchguard/scanner";
import type { ScanResult } from "@launchguard/shared";
import { parseGitHubUrl } from "./repository/parseGitHubUrl.js";
import { cloneRepository, type ClonedRepository } from "./repository/cloneRepository.js";
import { RepositoryScanError } from "../errors.js";
import { logger } from "../logger.js";

/**
 * Pure analyze step: given an already-acquired local checkout, runs the scanner and rule
 * engine and builds the report. Kept separate from acquisition so it can be exercised in
 * tests against local fixtures without any network/git dependency, and so a future worker
 * phase can move only the acquisition+analyze pairing behind a queue without touching this.
 */
export async function analyzeRepository(root: string, repository: { owner: string; name: string; url: string }): Promise<ScanResult> {
  let analysis;
  try {
    analysis = await scanRepository(root, repository);
  } catch (err) {
    if (err instanceof RepositoryTooLargeError) {
      throw new RepositoryScanError("REPOSITORY_TOO_LARGE", "Repository exceeds the safety limits for static analysis.");
    }
    throw new RepositoryScanError("REPOSITORY_SCAN_FAILED", "The repository could not be analyzed.");
  }

  const findings = runRules(allRules, { analysis });
  return buildScanResult(analysis, findings);
}

export interface ScanRepositoryUrlDeps {
  clone: (cloneUrl: string) => Promise<ClonedRepository>;
}

const defaultDeps: ScanRepositoryUrlDeps = { clone: cloneRepository };

export async function scanRepositoryUrl(repositoryUrl: string, deps: ScanRepositoryUrlDeps = defaultDeps): Promise<ScanResult> {
  const parsed = parseGitHubUrl(repositoryUrl);
  const { root, cleanup } = await deps.clone(parsed.cloneUrl);

  try {
    return await analyzeRepository(root, { owner: parsed.owner, name: parsed.name, url: parsed.url });
  } finally {
    await cleanup().catch((err: unknown) => logger.error({ err }, "repository cleanup failed"));
  }
}
