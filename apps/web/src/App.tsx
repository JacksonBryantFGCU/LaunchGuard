import { useState } from "react";
import type { ScanResult } from "@launchguard/shared";
import { scanRepository, ScanRequestError } from "./api";
import { RepositoryScanForm } from "./components/RepositoryScanForm";
import { ScanLoadingState } from "./components/ScanLoadingState";
import { ScanError } from "./components/ScanError";
import { RepositorySummary } from "./components/RepositorySummary";
import { SeveritySummary } from "./components/SeveritySummary";
import { FindingList } from "./components/FindingList";

type Status = "idle" | "loading" | "error" | "done";

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan(repositoryUrl: string) {
    setStatus("loading");
    setError(null);
    try {
      const scanResult = await scanRepository(repositoryUrl);
      setResult(scanResult);
      setStatus("done");
    } catch (err) {
      setError(err instanceof ScanRequestError ? err.message : "Unexpected error while scanning the repository.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">LaunchGuard</h1>
          <p className="text-slate-600">
            Paste a public GitHub repository URL to statically check it for common production-readiness gaps —
            missing configuration, risky scripts, and exposed secrets.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <RepositoryScanForm onSubmit={runScan} disabled={status === "loading"} />

        {status === "loading" && <ScanLoadingState />}
        {status === "error" && error && <ScanError message={error} />}

        {result && status === "done" && (
          <section className="mt-8 flex flex-col gap-6" aria-label="Scan results">
            <RepositorySummary repository={result.repository} project={result.project} statistics={result.statistics} />
            <SeveritySummary summary={result.summary} />
            <FindingList findings={result.findings} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
