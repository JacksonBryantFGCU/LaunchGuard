import type { VoiceStatus } from "../../features/architecture-review/reviewState.js";

const STATUS_LABELS: Record<VoiceStatus, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  ending: "Ending…",
  ended: "Call ended",
  error: "Connection error",
};

interface CallControlsProps {
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  locked: boolean;
  isMuted: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}

export function CallControls({ voiceStatus, voiceError, locked, isMuted, onStart, onEnd, onToggleMute }: CallControlsProps) {
  const canStart = !locked && (voiceStatus === "idle" || voiceStatus === "ended" || voiceStatus === "error");
  const showEnd = voiceStatus === "connecting" || voiceStatus === "connected" || voiceStatus === "ending";
  const isConnected = voiceStatus === "connected";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            isConnected ? "bg-emerald-500" : voiceStatus === "error" ? "bg-red-500" : "bg-slate-600"
          }`}
        />
        <p className="text-xs font-medium text-slate-300">{STATUS_LABELS[voiceStatus]}</p>
      </div>

      {voiceStatus === "error" && voiceError && (
        <p role="alert" className="text-xs text-red-400">
          {voiceError}
        </p>
      )}

      {locked && <p className="text-xs text-slate-500">Voice is disabled after a review is submitted.</p>}

      <div className="flex gap-2">
        {showEnd ? (
          <button
            type="button"
            onClick={onEnd}
            disabled={voiceStatus === "ending"}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End Conversation
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Conversation
          </button>
        )}

        {isConnected && (
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        )}
      </div>
    </div>
  );
}
