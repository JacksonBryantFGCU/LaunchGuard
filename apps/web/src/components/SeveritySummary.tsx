import type { FindingSeverity, ScanSummary } from "@launchguard/shared";

const SEVERITY_ORDER: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];

interface SeveritySummaryProps {
  summary: ScanSummary;
}

export function SeveritySummary({ summary }: SeveritySummaryProps) {
  return (
    <div className="flex flex-wrap gap-3" role="list" aria-label="Findings by severity">
      <SummaryStat label="Total findings" value={summary.totalFindings} />
      {SEVERITY_ORDER.filter((severity) => summary.bySeverity[severity] > 0).map((severity) => (
        <SummaryStat key={severity} label={severity} value={summary.bySeverity[severity]} />
      ))}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div role="listitem" className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
