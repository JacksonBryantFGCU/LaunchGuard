import type { TranscriptEntry, TranscriptSpeaker } from "@redline/shared";

// The ElevenLabs React SDK currently reports each conversation turn as a
// single finalized message ({ message, source }), not a stream of
// interim/final fragments - so every entry here is created final. `final`
// stays part of the shape (rather than being assumed true) so a later SDK
// version that adds partial/interim events can be wired in here without a
// domain-model change.
export function createTranscriptEntry(source: "user" | "ai", text: string): TranscriptEntry {
  const speaker: TranscriptSpeaker = source === "user" ? "reviewer" : "developer";
  return {
    id: crypto.randomUUID(),
    speaker,
    text,
    timestamp: new Date().toISOString(),
    final: true,
  };
}
