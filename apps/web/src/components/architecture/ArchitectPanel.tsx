import type { PublicArchitectureScenario } from "@redline/shared";
import { useArchitectConversation } from "../../features/voice/useArchitectConversation.js";
import { CallControls } from "../voice/CallControls.js";
import { ConversationTranscript } from "../voice/ConversationTranscript.js";

export function ArchitectPanel({ scenario, locked }: { scenario: PublicArchitectureScenario; locked: boolean }) {
  const { start, end, voiceStatus, voiceError, transcript, isMuted, setMuted } = useArchitectConversation(scenario.slug);

  return (
    <div className="border-b border-slate-800 bg-slate-900">
      <div className="p-4">
        <p className="text-sm font-semibold text-slate-100">{scenario.architect.name}</p>
        <p className="text-xs text-slate-500">{scenario.architect.role}</p>
        <p className="mt-1 text-xs text-slate-500">Architecture Author · {scenario.status}</p>

        <div className="mt-3">
          <CallControls
            voiceStatus={voiceStatus}
            voiceError={voiceError}
            locked={locked}
            isMuted={isMuted}
            onStart={start}
            onEnd={end}
            onToggleMute={() => setMuted(!isMuted)}
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto border-t border-slate-800 p-4">
        <ConversationTranscript transcript={transcript} architectName={scenario.architect.name} />
      </div>
    </div>
  );
}
