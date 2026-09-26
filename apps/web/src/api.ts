import type { ScanResult } from "@launchguard/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ScanRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScanRequestError";
    this.code = code;
  }
}

export async function scanRepository(repositoryUrl: string): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/scans`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repositoryUrl }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const code = body?.error ?? "REPOSITORY_SCAN_FAILED";
    const message = body?.message ?? "The scan could not be completed.";
    throw new ScanRequestError(code, message);
  }

  return body as ScanResult;
}
