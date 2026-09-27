import { useEffect, useState } from "react";
import { useStressLab, type StressLabState } from "./useStressLab.js";
import { useSelection, type ArchitectureSelection } from "../architecture-review/useSelection.js";
import { initialPlaybackState, play, pause, next, previous, restart, jumpTo, tick, type PlaybackState } from "./playback.js";

const TICK_MS = 700;

export interface StressLabTabState {
  lab: StressLabState;
  selection: ArchitectureSelection;
  selectNode: (id: string) => void;
  selectEdge: (id: string) => void;
  clearSelection: () => void;
  view: "lab" | "modify";
  setView: (view: "lab" | "modify") => void;
  speed: 1 | 2 | 4;
  setSpeed: (speed: 1 | 2 | 4) => void;
  playback: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
  onScrub: (frameIndex: number) => void;
}

/**
 * Owns every piece of Stress Lab state (loaded tests, active run, selection,
 * playback, view mode) for the lifetime of the investigation page - not the
 * Stress Lab tab's render. Called once at the top of
 * PracticeInvestigationPage so switching to Architecture/Requirements/Ask
 * Architect/Response and back never loses the selected test, parameters,
 * design modifications, or completed runs (spec #17).
 */
export function useStressLabTabState(reviewSessionId: string, practiceScenarioId: string): StressLabTabState {
  const lab = useStressLab(reviewSessionId, practiceScenarioId);
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();
  const [view, setView] = useState<"lab" | "modify">("lab");
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [playback, setPlayback] = useState(() => initialPlaybackState(lab.activeResult?.frames.length ?? 0));

  useEffect(() => {
    // A new run means a new timeline - playback always restarts at frame 0 rather than carrying over the previous run's scrub position.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayback(initialPlaybackState(lab.activeResult?.frames.length ?? 0));
  }, [lab.activeResult]);

  useEffect(() => {
    if (playback.status !== "playing") return;
    const id = setInterval(() => setPlayback((s) => tick(s)), TICK_MS / speed);
    return () => clearInterval(id);
  }, [playback.status, speed]);

  return {
    lab,
    selection,
    selectNode,
    selectEdge,
    clearSelection,
    view,
    setView,
    speed,
    setSpeed,
    playback,
    onPlay: () => setPlayback((s) => play(s)),
    onPause: () => setPlayback((s) => pause(s)),
    onNext: () => setPlayback((s) => next(s)),
    onPrevious: () => setPlayback((s) => previous(s)),
    onRestart: () => setPlayback((s) => restart(s)),
    onScrub: (i: number) => setPlayback((s) => jumpTo(s, i)),
  };
}
