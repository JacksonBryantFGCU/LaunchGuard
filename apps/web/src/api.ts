import type { ScanRequest, ScanResult } from "@launchguard/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/** Phase 1 has no repository input yet, so we analyze a built-in sample project. */
export const sampleScanRequest: ScanRequest = {
  project: {
    name: "sample-web-service",
    hasEnvExample: false,
    hasBuildScript: true,
    hasStartScript: true,
    hasHealthCheck: false,
    corsOrigins: ["*"],
  },
};

export async function analyzeProject(request: ScanRequest): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/scans/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Scan failed with status ${res.status}`);
  }

  return res.json();
}
