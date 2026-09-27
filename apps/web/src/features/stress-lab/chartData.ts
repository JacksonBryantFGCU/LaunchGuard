import type { SimulationEvent, SimulationFrame } from "@redline/shared";

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
