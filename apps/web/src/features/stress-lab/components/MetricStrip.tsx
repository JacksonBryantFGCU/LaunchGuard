const METRIC_LABELS: Record<string, string> = {
  checkoutP95Ms: "Checkout p95",
  dbUtilizationPercent: "DB Utilization",
  totalConnections: "DB Connections",
  trafficRequestsPerMinute: "Traffic",
  availabilityPercent: "Availability",
};

function formatMetric(key: string, value: number): string {
  if (key === "checkoutP95Ms") return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
  if (key === "dbUtilizationPercent" || key === "availabilityPercent") return `${Math.round(value)}%`;
  if (key === "trafficRequestsPerMinute") return `${Math.round(value).toLocaleString()} rpm`;
  return value.toLocaleString();
}

// Only scenario-relevant metrics the backend actually returned (spec #25) - never a full raw telemetry dump.
// `visibleKeys` narrows further to the 3-4 metrics relevant to the active test category (spec #10); omitted, every known metric present is shown.
export function MetricStrip({ metrics, visibleKeys }: { metrics: Record<string, number>; visibleKeys?: string[] }) {
  const allowedKeys = visibleKeys ?? Object.keys(METRIC_LABELS);
  const entries = Object.entries(metrics).filter(([key]) => key in METRIC_LABELS && allowedKeys.includes(key));
  if (entries.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{METRIC_LABELS[key]}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-100">{formatMetric(key, value)}</dd>
        </div>
      ))}
    </dl>
  );
}
