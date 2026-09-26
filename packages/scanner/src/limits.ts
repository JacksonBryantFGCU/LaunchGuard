/** Centralized safety limits for repository inventory/inspection. */
export const SCAN_LIMITS = {
  /** Stop walking entirely once this many filesystem entries have been visited (files + dirs). */
  hardStopEntries: 20_000,
  /** Cap on how many files are kept in the analyzed inventory. */
  maxFilesAnalyzed: 5_000,
  /** Cap on how deep the directory tree is traversed, relative to the repository root. */
  maxTraversalDepth: 12,
  /** Individual text file size cap for content inspection (secrets/CORS signals). */
  maxTextFileBytes: 256 * 1024,
  /** Total bytes of text content read across the whole scan. */
  maxTotalTextBytes: 5 * 1024 * 1024,
} as const;

export const IGNORED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "target",
  "vendor",
  ".cache",
  ".turbo",
  ".venv",
  "__pycache__",
]);

export const BINARY_LIKE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".mov", ".avi", ".webm",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm",
  ".lock",
]);
