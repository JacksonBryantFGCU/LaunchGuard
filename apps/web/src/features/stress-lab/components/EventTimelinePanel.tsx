import type { SimulationEvent } from "@redline/shared";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TYPE_LABEL: Record<SimulationEvent["type"], string> = {
  traffic_change: "Traffic",
  scaling: "Scaling",
  saturation: "Saturation",
  requirement_change: "Requirement",
  failure: "Failure",
  recovery: "Recovery",
};

// Only meaningful state changes appear here (spec #18/#54) - the engine
// already dedupes to real transitions, so this just renders what it's given.
export function EventTimelinePanel({ events, onJumpTo }: { events: SimulationEvent[]; onJumpTo: (seconds: number) => void }) {
  if (events.length === 0) {
    return <p className="text-xs text-slate-500">No notable state changes yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-1">
      {events.map((event, i) => (
        <li key={`${event.atSeconds}-${i}`}>
          <button
            type="button"
            onClick={() => onJumpTo(event.atSeconds)}
            className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-slate-800"
          >
            <span className="font-mono text-slate-500">{formatTime(event.atSeconds)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{TYPE_LABEL[event.type]}</span>
            <span className="text-slate-300">{event.message}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
