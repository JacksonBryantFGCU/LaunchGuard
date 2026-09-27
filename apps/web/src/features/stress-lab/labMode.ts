import { isComplete, type PlaybackState } from "./playback.js";

export type LabMode = "configure" | "simulate" | "analyze";

// Derived purely from playback + result presence (spec #32) so switching
// modes never needs its own state - scrubbing back from the final frame
// falls back to "simulate" for free.
export function deriveLabMode(hasActiveResult: boolean, playback: PlaybackState): LabMode {
  if (!hasActiveResult) return "configure";
  return isComplete(playback) ? "analyze" : "simulate";
}
