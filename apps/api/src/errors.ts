export type RepositoryScanErrorCode =
  | "INVALID_REPOSITORY_URL"
  | "UNSUPPORTED_REPOSITORY_HOST"
  | "REPOSITORY_NOT_FOUND"
  | "REPOSITORY_ACCESS_DENIED"
  | "REPOSITORY_CLONE_TIMEOUT"
  | "REPOSITORY_TOO_LARGE"
  | "GIT_UNAVAILABLE"
  | "REPOSITORY_SCAN_FAILED";

const STATUS_BY_CODE: Record<RepositoryScanErrorCode, number> = {
  INVALID_REPOSITORY_URL: 400,
  UNSUPPORTED_REPOSITORY_HOST: 400,
  REPOSITORY_NOT_FOUND: 404,
  REPOSITORY_ACCESS_DENIED: 403,
  REPOSITORY_CLONE_TIMEOUT: 504,
  REPOSITORY_TOO_LARGE: 413,
  GIT_UNAVAILABLE: 503,
  REPOSITORY_SCAN_FAILED: 502,
};

/** A client-safe, expected failure of the repository scan pipeline. Never carries stack traces or paths. */
export class RepositoryScanError extends Error {
  readonly code: RepositoryScanErrorCode;
  readonly status: number;

  constructor(code: RepositoryScanErrorCode, message: string) {
    super(message);
    this.name = "RepositoryScanError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
