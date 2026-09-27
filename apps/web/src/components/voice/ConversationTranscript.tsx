import type { ArchitectConversationTurn } from "@purgatory/shared";

interface Props {
  transcript: ArchitectConversationTurn[];
  architectName: string;
}

export function ConversationTranscript({ transcript, architectName }: Props) {
  if (transcript.length === 0) {
    return <p className="text-xs text-slate-500">No conversation yet. Start a call to speak with {architectName}.</p>;
  }

  return (
    <ol className="flex flex-col gap-3" aria-label="Conversation transcript">
      {transcript.map((turn) => (
        <li key={turn.id}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {turn.speaker === "reviewer" ? "Reviewer" : architectName}
          </p>
          <p className="mt-0.5 text-sm text-slate-200">{turn.text}</p>
        </li>
      ))}
    </ol>
  );
}
