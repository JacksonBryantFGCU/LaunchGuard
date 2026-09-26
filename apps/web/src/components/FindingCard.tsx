import type { Finding, FindingSeverity } from "@launchguard/shared";

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  info: "bg-slate-100 text-slate-700 border-slate-300",
};

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-500">{finding.category}</span>
        <h3 className="w-full text-lg font-semibold text-slate-900">{finding.title}</h3>
      </div>
      <p className="mt-2 text-slate-700">{finding.explanation}</p>
      <p className="mt-2 text-sm text-slate-600">
        <span className="font-medium text-slate-800">Remediation: </span>
        {finding.remediation}
      </p>
      {finding.evidence.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm text-slate-500">
          {finding.evidence.map((evidence, i) => (
            <li key={i}>
              {evidence.file && <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{evidence.file}</code>} {evidence.description}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
