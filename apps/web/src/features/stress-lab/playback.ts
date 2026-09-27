export type PlaybackStatus = "paused" | "playing";

export interface PlaybackState {
  status: PlaybackStatus;
  currentFrameIndex: number;
  frameCount: number;
}

function clampIndex(index: number, frameCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(frameCount - 1, 0));
}

export function initialPlaybackState(frameCount: number): PlaybackState {
  return { status: "paused", currentFrameIndex: 0, frameCount };
}

export function play(state: PlaybackState): PlaybackState {
  return { ...state, status: "playing" };
}

export function pause(state: PlaybackState): PlaybackState {
  return { ...state, status: "paused" };
}

export function jumpTo(state: PlaybackState, index: number): PlaybackState {
  return { ...state, currentFrameIndex: clampIndex(index, state.frameCount) };
}

export function next(state: PlaybackState): PlaybackState {
  return jumpTo(state, state.currentFrameIndex + 1);
}

export function previous(state: PlaybackState): PlaybackState {
  return jumpTo(state, state.currentFrameIndex - 1);
}

export function restart(state: PlaybackState): PlaybackState {
  return { ...state, currentFrameIndex: 0, status: "paused" };
}

/** One playback-clock advance. Auto-pauses on reaching the final frame - playback never "completes" while still marked playing (spec #14/#68). */
export function tick(state: PlaybackState): PlaybackState {
  if (state.status !== "playing") return state;
  const atEnd = state.currentFrameIndex >= state.frameCount - 1;
  if (atEnd) return { ...state, status: "paused" };
  return next(state);
}

export function isComplete(state: PlaybackState): boolean {
  return state.currentFrameIndex >= state.frameCount - 1;
}
