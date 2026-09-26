import { useState } from "react";
import type { ScanResult, FindingSeverity } from "@launchguard/shared";
import { analyzeProject, sampleScanRequest } from "./api";

type Status = "idle" | "loading" | "error" | "done";

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  info: "bg-slate-100 text-slate-700 border-slate-300",
};

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setStatus("loading");
    setError(null);
    try {
      const scanResult = await analyzeProject(sampleScanRequest);
      setResult(scanResult);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">LaunchGuard</h1>
          <p className="text-slate-600">
            Deterministic production-readiness analysis for software repositories.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <button
          type="button"
          onClick={runScan}
          disabled={status === "loading"}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Scanning…" : "Run scan"}
        </button>

        {status === "error" && (
          <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-8" aria-label="Scan results">
            <div className="mb-6 flex flex-wrap gap-4">
              <SummaryStat label="Total findings" value={result.summary.totalFindings} />
              {(Object.entries(result.summary.bySeverity) as [FindingSeverity, number][])
                .filter(([, count]) => count > 0)
                .map(([severity, count]) => (
                  <SummaryStat key={severity} label={severity} value={count} />
                ))}
            </div>

            {result.findings.length === 0 ? (
              <p className="text-slate-600">No findings — nothing to report for this project.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {result.findings.map((finding) => (
                  <li key={finding.ruleId} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[finding.severity]}`}
                      >
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
                          <li key={i}>{evidence.description}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default App;
