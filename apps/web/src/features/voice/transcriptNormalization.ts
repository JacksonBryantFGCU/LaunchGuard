import type { ArchitectConversationTurn, ConversationSpeaker } from "@purgatory/shared";

// Mirrors @elevenlabs/client's MessagePayload.role ("user" | "agent") -
// the app never depends on the raw provider event shape beyond this input.
export interface RawMessageEvent {
  role: string;
  message: string;
  eventId?: number;
}

/** Normalizes a raw provider message event into a Redline transcript turn, or null if malformed. */
export function normalizeMessageEvent(event: RawMessageEvent, timestamp: string): ArchitectConversationTurn | null {
  const text = event.message?.trim();
  if (!text) return null;

  const speaker: ConversationSpeaker | null = event.role === "user" ? "reviewer" : event.role === "agent" ? "architect" : null;
  if (!speaker) return null;

  const id = typeof event.eventId === "number" ? `turn-${event.eventId}` : `turn-${speaker}-${timestamp}`;
  return { id, speaker, text, timestamp, final: true };
}
