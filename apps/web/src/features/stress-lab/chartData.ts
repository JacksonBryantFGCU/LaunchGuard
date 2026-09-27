import type { SimulationBottleneck, SimulationEvent, SimulationFrame } from "@purgatory/shared";

export type ChartRow = { timestampSeconds: number } & Record<string, number>;

// Only the metric keys actually present across the frames become chart
// series (spec #52: show only scenario-relevant series, never invent one).
export function framesToChartSeries(frames: SimulationFrame[]): ChartRow[] {
  return frames.map((f) => ({ timestampSeconds: f.timestampSeconds, ...f.systemMetrics }));
}

/** Maps a clicked chart-playhead time to the closest frame index (spec #53/#71) - never alters simulation, just selects which frame to display. */
export function nearestFrameIndexForTime(frames: SimulationFrame[], seconds: number): number {
  let closestIndex = 0;
  let closestDistance = Infinity;
  frames.forEach((f, i) => {
    const distance = Math.abs(f.timestampSeconds - seconds);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  });
  return closestIndex;
}

export function flattenEvents(frames: SimulationFrame[]): SimulationEvent[] {
  return frames.flatMap((f) => f.events);
}

const SEVERITY_RANK: Record<SimulationBottleneck["severity"], number> = { low: 0, medium: 1, high: 2, critical: 3 };

/**
 * Which chart series are actually worth showing for this run, not a fixed
 * three every time (spec #52): the metric each bottleneck names (worst
 * severity first) leads, then any remaining observed metrics fill the rest,
 * capped at maxKeys. Only ever returns keys that a frame actually produced.
 */
export function selectPrimaryChartKeys(series: ChartRow[], bottlenecks: SimulationBottleneck[], maxKeys = 3): string[] {
  const availableKeys = new Set(series.length > 0 ? Object.keys(series[0]!).filter((k) => k !== "timestampSeconds") : []);
  const bottleneckKeysBySeverity = [...bottlenecks]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .map((b) => b.metric)
    .filter((metric) => availableKeys.has(metric));

  const ordered: string[] = [];
  for (const key of [...bottleneckKeysBySeverity, ...availableKeys]) {
    if (!ordered.includes(key)) ordered.push(key);
    if (ordered.length >= maxKeys) break;
  }
  return ordered;
}
