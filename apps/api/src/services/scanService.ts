import { allRules, runRules } from "@launchguard/rules";
import { buildScanResult } from "@launchguard/report";
import type { ScanRequest, ScanResult } from "@launchguard/shared";

export function analyzeProject(request: ScanRequest): ScanResult {
  const findings = runRules(allRules, { project: request.project });
  return buildScanResult(request.project.name, findings);
}
