// UX hint only — the API is the authoritative validator.
const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

export function isLikelyGitHubUrl(value: string): boolean {
  return GITHUB_URL_PATTERN.test(value.trim());
}
