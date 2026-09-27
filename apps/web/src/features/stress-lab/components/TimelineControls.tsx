import type { SimulationFrame } from "@redline/shared";
import type { PlaybackState } from "../playback.js";

function formatSimulatedTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimelineControls({
  frames,
  playback,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onRestart,
  onScrub,
}: {
  frames: SimulationFrame[];
  playback: PlaybackState;
  speed: 1 | 2 | 4;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
  onScrub: (frameIndex: number) => void;
}) {
  const currentFrame = frames[playback.currentFrameIndex];
  const lastFrame = frames[frames.length - 1];
  if (!currentFrame || !lastFrame) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Simulated Time{" "}
          <span className="ml-1 font-mono normal-case text-slate-300">
            {formatSimulatedTime(currentFrame.timestampSeconds)} / {formatSimulatedTime(lastFrame.timestampSeconds)}
          </span>
        </p>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          {([1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`rounded px-1.5 py-0.5 font-semibold ${speed === s ? "bg-slate-700 text-slate-100" : "hover:text-slate-300"}`}
            >
              {s}&times;
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={playback.currentFrameIndex}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Timeline scrubber"
        className="accent-sky-500"
      />

      <div className="flex items-center gap-2">
        <button type="button" onClick={onRestart} className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500">
          Restart
        </button>
        <button type="button" onClick={onPrevious} disabled={playback.currentFrameIndex === 0} className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 disabled:opacity-40">
          Previous
        </button>
        <button
          type="button"
          onClick={playback.status === "playing" ? onPause : onPlay}
          className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500"
        >
          {playback.status === "playing" ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={playback.currentFrameIndex >= frames.length - 1}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 disabled:opacity-40"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
