import type { Finding, FindingCategory, FindingSeverity, ScanResult, ScanSummary } from "@launchguard/shared";

const ALL_SEVERITIES: FindingSeverity[] = ["info", "low", "medium", "high", "critical"];
const ALL_CATEGORIES: FindingCategory[] = ["configuration", "security", "reliability", "operability"];

export function summarize(findings: Finding[]): ScanSummary {
  const bySeverity = Object.fromEntries(ALL_SEVERITIES.map((s) => [s, 0])) as Record<FindingSeverity, number>;
  const byCategory = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<FindingCategory, number>;

  for (const finding of findings) {
    bySeverity[finding.severity]++;
    byCategory[finding.category]++;
  }

  return { totalFindings: findings.length, bySeverity, byCategory };
}

export function buildScanResult(projectName: string, findings: Finding[]): ScanResult {
  return {
    projectName,
    scannedAt: new Date().toISOString(),
    findings,
    summary: summarize(findings),
  };
}
