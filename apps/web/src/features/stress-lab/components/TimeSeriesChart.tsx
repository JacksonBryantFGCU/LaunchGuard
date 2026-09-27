import { memo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import type { ChartRow } from "../chartData.js";

interface TimeSeriesChartProps {
  data: ChartRow[];
  dataKey: string;
  label: string;
  unit?: string;
  color: string;
  currentTimeSeconds: number;
  onScrub: (seconds: number) => void;
  // True when a selected requirement/bottleneck correlates to this metric
  // (spec #3) - a visual focus ring, never invented when there's no
  // structural link.
  highlighted?: boolean;
}

function TimeSeriesChartImpl({ data, dataKey, label, unit, color, currentTimeSeconds, onScrub, highlighted }: TimeSeriesChartProps) {
  return (
    <div className={`rounded-md border bg-slate-900 p-2 transition-colors ${highlighted ? "border-sky-500 ring-1 ring-sky-500" : "border-slate-800"}`}>
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {unit ? ` (${unit})` : ""}
        {highlighted && <span className="ml-1 text-sky-400">(focused)</span>}
      </p>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onClick={(state) => {
              const label = state?.activeLabel;
              if (typeof label === "number") onScrub(label);
            }}
          >
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="timestampSeconds" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `${v}s`} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={36} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }}
              labelFormatter={(v) => `t = ${v}s`}
            />
            <ReferenceLine x={currentTimeSeconds} stroke="#38bdf8" strokeDasharray="3 3" />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoized (spec #50): playback ticks every frame, and re-rendering a chart
// whose data hasn't changed (only the playhead has) would still be cheap,
// but memoizing avoids the surrounding panel re-rendering it needlessly.
export const TimeSeriesChart = memo(TimeSeriesChartImpl);
