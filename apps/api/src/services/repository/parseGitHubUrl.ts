import { RepositoryScanError } from "../../errors.js";

export interface ParsedGitHubRepository {
  owner: string;
  name: string;
  /** Normalized https clone URL, always ending in .git. */
  cloneUrl: string;
  /** Normalized canonical repository page URL. */
  url: string;
}

const ALLOWED_HOST = "github.com";
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Validates and normalizes a public GitHub repository URL. This is the backend's authoritative
 * check — frontend validation is a UX hint only. Rejects anything that is not exactly
 * `https://github.com/<owner>/<repo>` (SSH URLs, git://, file://, other hosts, embedded
 * credentials, and path-traversal-shaped segments are all rejected).
 */
export function parseGitHubUrl(input: string): ParsedGitHubRepository {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new RepositoryScanError("INVALID_REPOSITORY_URL", "Repository URL is required.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new RepositoryScanError("INVALID_REPOSITORY_URL", "Repository URL is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new RepositoryScanError("UNSUPPORTED_REPOSITORY_HOST", "Only https:// GitHub repository URLs are supported.");
  }

  if (url.username || url.password) {
    throw new RepositoryScanError("INVALID_REPOSITORY_URL", "Repository URL must not contain credentials.");
  }

  if (url.hostname.toLowerCase() !== ALLOWED_HOST) {
    throw new RepositoryScanError("UNSUPPORTED_REPOSITORY_HOST", "Only github.com repositories are supported in this phase.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new RepositoryScanError("INVALID_REPOSITORY_URL", "Repository URL must look like https://github.com/owner/repository.");
  }

  const [ownerRaw, repoRaw] = segments;
  const name = repoRaw.replace(/\.git$/i, "");
  const owner = ownerRaw;

  if (!SAFE_SEGMENT.test(owner) || !SAFE_SEGMENT.test(name) || owner.includes("..") || name.includes("..")) {
    throw new RepositoryScanError("INVALID_REPOSITORY_URL", "Repository owner/name contains unsupported characters.");
  }

  return {
    owner,
    name,
    cloneUrl: `https://github.com/${owner}/${name}.git`,
    url: `https://github.com/${owner}/${name}`,
  };
}
