import { useReviewSessionContext } from "../../features/review/reviewSessionContextInternal.js";
import { VOICE_STATUS_LABEL } from "../../features/voice/labels.js";

export function DeveloperPanel() {
  const { scenario, state, isLocked, startCall, endCall } = useReviewSessionContext();
  const { pullRequest } = scenario;
  const { voiceStatus, voiceErrorMessage, transcript } = state;

  const canStart = !isLocked && (voiceStatus === "idle" || voiceStatus === "ended" || voiceStatus === "error");
  const canEnd = voiceStatus === "connecting" || voiceStatus === "connected";

  return (
    <aside aria-label="Developer conversation" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden border-l border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-100">{pullRequest.author}</p>
        <p className="text-xs text-slate-500">Author of PR #{pullRequest.number}</p>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
        <p className="text-xs text-slate-400" aria-live="polite">
          {VOICE_STATUS_LABEL[voiceStatus]}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void startCall()}
            disabled={!canStart}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Call
          </button>
          <button
            type="button"
            onClick={() => void endCall()}
            disabled={!canEnd}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End Call
          </button>
        </div>
      </div>

      {voiceStatus === "error" && voiceErrorMessage && (
        <p role="alert" className="text-xs text-red-400">
          {voiceErrorMessage}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2">
        {transcript.length === 0 ? (
          <p className="text-xs text-slate-500">
            {voiceStatus === "connected"
              ? "Listening…"
              : "Start a call to talk with the developer about this PR."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {transcript.map((entry) => (
              <li key={entry.id}>
                <p className="text-xs font-semibold text-slate-400">
                  {entry.speaker === "reviewer" ? "Reviewer" : pullRequest.author}
                </p>
                <p className="mt-0.5 text-sm text-slate-200">{entry.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
