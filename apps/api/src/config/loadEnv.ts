import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Determines the effective NODE_ENV for env-file loading purposes. Falls
 * back to "test" when NODE_ENV itself is unset but pnpm/npm's own
 * `npm_lifecycle_event` says the "test" script is running - this works
 * cross-platform (Windows cmd.exe included) without relying on
 * shell-specific `NODE_ENV=test some-command` syntax.
 */
export function effectiveNodeEnv(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV) return env.NODE_ENV;
  if (env.npm_lifecycle_event === "test") return "test";
  return "development";
}

/**
 * Loads apps/api's local env files into `target` (process.env in
 * production/normal use; an isolated object in tests). Precedence:
 * existing target values > .env.local > .env > (nothing here - Zod
 * defaults apply after). dotenv.config never overrides a key already
 * present in `target`, so loading .env.local first and .env second gives
 * exactly that order for free.
 *
 * Skipped entirely for "production" (deployed environments should rely on
 * real process env vars) and "test" (test runs must be hermetic and never
 * depend on whatever secrets happen to sit in a developer's .env.local).
 */
export function loadLocalEnvFiles(
  baseDir: string,
  nodeEnv: string,
  target: NodeJS.ProcessEnv = process.env,
): void {
  if (nodeEnv === "production" || nodeEnv === "test") return;

  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(baseDir, filename);
    if (existsSync(filePath)) {
      dotenv.config({ path: filePath, processEnv: target });
    }
  }
}
