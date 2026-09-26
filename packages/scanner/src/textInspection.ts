import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { PotentialSecret, RepositorySignals, ScanWarning } from "@launchguard/shared";
import type { RepositoryInventory } from "./inventory.js";
import { BINARY_LIKE_EXTENSIONS, SCAN_LIMITS } from "./limits.js";

interface SecretPattern {
  name: string;
  regex: RegExp;
}

// Conservative, high-confidence formats only; generic "secret=" assignments are too noisy.
const SECRET_PATTERNS: SecretPattern[] = [
  { name: "aws-access-key-id", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "github-personal-access-token", regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: "slack-token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "private-key-block", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const CORS_WILDCARD_PATTERN = /(?:origin\s*:\s*['"]\*['"])|(?:Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"])|(?:cors\(\s*\)\s*)/i;

/** Filenames worth inspecting for a literal CORS wildcard, kept narrow and shallow. */
function isCorsCandidate(relativePath: string): boolean {
  const base = path.basename(relativePath).toLowerCase();
  const depth = relativePath.split("/").length;
  return depth <= 3 && /^(server|app|index|main)\.(ts|js|mjs|cjs)$/.test(base);
}

/** Small config-like files worth scanning for committed secrets. */
function isSecretCandidate(relativePath: string): boolean {
  const base = path.basename(relativePath).toLowerCase();
  return base.startsWith(".env") || /\.(json|ya?ml|toml|ini|cfg|conf)$/.test(base);
}

function isBinaryLikeExtension(relativePath: string): boolean {
  const dot = relativePath.lastIndexOf(".");
  if (dot === -1) return false;
  return BINARY_LIKE_EXTENSIONS.has(relativePath.slice(dot).toLowerCase());
}

export interface TextInspectionResult {
  potentialSecrets: PotentialSecret[];
  signals: RepositorySignals;
}

export async function inspectTextContents(
  inventory: RepositoryInventory,
  warnings: ScanWarning[],
): Promise<TextInspectionResult> {
  const potentialSecrets: PotentialSecret[] = [];
  const corsWildcardFiles: string[] = [];
  let totalBytesRead = 0;
  let budgetExhausted = false;

  for (const file of inventory.files) {
    if (isBinaryLikeExtension(file.relativePath)) continue;

    const wantsCorsCheck = isCorsCandidate(file.relativePath);
    const wantsSecretCheck = isSecretCandidate(file.relativePath);
    if (!wantsCorsCheck && !wantsSecretCheck) continue;

    if (totalBytesRead >= SCAN_LIMITS.maxTotalTextBytes) {
      budgetExhausted = true;
      break;
    }

    let size: number;
    try {
      size = (await stat(file.absolutePath)).size;
    } catch {
      continue;
    }
    if (size > SCAN_LIMITS.maxTextFileBytes) continue;

    let content: string;
    try {
      content = await readFile(file.absolutePath, "utf8");
    } catch {
      continue;
    }
    totalBytesRead += size;

    // A null byte means this "text-like" file is actually binary; skip it.
    if (content.includes("\u0000")) continue;

    if (wantsSecretCheck) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          potentialSecrets.push({ file: file.relativePath, pattern: pattern.name });
        }
      }
    }

    if (wantsCorsCheck && CORS_WILDCARD_PATTERN.test(content)) {
      corsWildcardFiles.push(file.relativePath);
    }
  }

  if (budgetExhausted) {
    warnings.push({ code: "text-budget-exhausted", message: "Total text inspection budget reached before all candidate files were read." });
  }

  return { potentialSecrets, signals: { corsWildcardFiles } };
}
