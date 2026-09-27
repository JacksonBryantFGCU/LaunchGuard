import { useEffect, useState } from "react";
import type { SimulationEvent, StressSimulationRunRecord } from "@purgatory/shared";
import type { ChartRow } from "../chartData.js";
import { TimeSeriesChart } from "./TimeSeriesChart.js";
import { EventTimelinePanel } from "./EventTimelinePanel.js";
import { ComparisonPanel } from "./ComparisonPanel.js";
import { RunHistoryPanel } from "./RunHistoryPanel.js";

const CHART_COLORS = ["#38bdf8", "#f59e0b", "#f97316"];

function formatMetricLabel(key: string): string {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Charts, comparison, event timeline, and run history live here instead of
 * an always-visible footer (spec #13/#23) so they never compete with the
 * architecture graph during SIMULATE - collapsed by default there, expanded
 * by default once a run completes (ANALYZE), never overlapping the canvas
 * since this only ever renders below the grid with its own bounded height.
 */
export function AnalysisDrawer({
  chartSeries,
  primaryChartKeys,
  currentTimeSeconds,
  onScrub,
  highlightedMetric,
  comparison,
  timelineEvents,
  runs,
  activeRunId,
  onSelectRun,
  defaultExpanded,
}: {
  chartSeries: ChartRow[];
  primaryChartKeys: string[];
  currentTimeSeconds: number;
  onScrub: (seconds: number) => void;
  highlightedMetric?: string;
  comparison?: { baseline: StressSimulationRunRecord; current: StressSimulationRunRecord; isStrict: boolean };
  timelineEvents: SimulationEvent[];
  runs: StressSimulationRunRecord[];
  activeRunId: string | undefined;
  onSelectRun: (run: StressSimulationRunRecord) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  if (!expanded) {
    return (
      <div className="border-t border-slate-800 px-4 py-2">
        <button type="button" onClick={() => setExpanded(true)} className="text-xs font-medium text-sky-400 hover:text-sky-300">
          [ Show Analysis ]{runs.length > 0 ? ` · Runs (${runs.length})` : ""}
        </button>
      </div>
    );
  }

  return (
    <div className="scroll-panel max-h-[30vh] shrink-0 overflow-y-auto border-t border-slate-800 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Analysis</h3>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs font-medium text-sky-400 hover:text-sky-300">
          [ Collapse ]
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {primaryChartKeys.map((key, i) => (
          <TimeSeriesChart
            key={key}
            data={chartSeries}
            dataKey={key}
            label={formatMetricLabel(key)}
            color={CHART_COLORS[i % CHART_COLORS.length]!}
            currentTimeSeconds={currentTimeSeconds}
            onScrub={onScrub}
            highlighted={highlightedMetric === key}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {comparison && <ComparisonPanel baseline={comparison.baseline} current={comparison.current} isStrict={comparison.isStrict} />}
          {runs.length > 0 && <RunHistoryPanel runs={runs} activeRunId={activeRunId} onSelect={onSelectRun} />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event Timeline</p>
          <div className="mt-2">
            <EventTimelinePanel events={timelineEvents} onJumpTo={onScrub} />
          </div>
        </div>
      </div>
    </div>
  );
}
