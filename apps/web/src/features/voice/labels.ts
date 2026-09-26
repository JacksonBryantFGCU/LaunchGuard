import type { VoiceStatus } from "./types.js";

export const VOICE_STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  ending: "Ending…",
  ended: "Call ended",
  error: "Connection error",
};
