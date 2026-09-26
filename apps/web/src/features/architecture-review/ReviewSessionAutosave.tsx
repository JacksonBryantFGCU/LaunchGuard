import { useEffect, useRef } from "react";
import type { Redline } from "@redline/shared";
import { useReviewState } from "./reviewStateStore.js";
import { isReviewLocked } from "./reviewState.js";
import { updateDraft, addRedline, updateRedline, deleteRedline, addTranscriptTurn } from "../review-session/api.js";

const DRAFT_SAVE_DEBOUNCE_MS = 500;

interface DraftFields {
  reviewedNodeIds: string[];
  reviewedEdgeIds: string[];
  reviewerNotes: string;
}

function sameDraft(a: DraftFields, b: DraftFields): boolean {
  return a.reviewerNotes === b.reviewerNotes && a.reviewedNodeIds.join(",") === b.reviewedNodeIds.join(",") && a.reviewedEdgeIds.join(",") === b.reviewedEdgeIds.join(",");
}

// Persists discrete review-state changes to the durable session as they
// happen. Renders nothing - a pure side-effect component mounted once
// inside ReviewStateProvider. Failures are logged and left to retry
// naturally on the next state change (every save sends the current full
// value, never a delta), so a dropped request never corrupts local state.
export function ReviewSessionAutosave() {
  const { state } = useReviewState();
  const { reviewSessionId } = state;
  const locked = isReviewLocked(state);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDraftRef = useRef<DraftFields | null>(null);

  useEffect(() => {
    if (!reviewSessionId || locked) return;
    const current: DraftFields = {
      reviewedNodeIds: state.reviewedNodeIds,
      reviewedEdgeIds: state.reviewedEdgeIds,
      reviewerNotes: state.reviewerNotes,
    };
    if (lastSavedDraftRef.current && sameDraft(lastSavedDraftRef.current, current)) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      updateDraft(reviewSessionId, current)
        .then(() => {
          lastSavedDraftRef.current = current;
        })
        .catch((err: unknown) => console.error("Redline autosave (draft) failed", err));
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [reviewSessionId, locked, state.reviewedNodeIds, state.reviewedEdgeIds, state.reviewerNotes]);

  const prevRedlinesRef = useRef<Redline[]>(state.redlines);
  useEffect(() => {
    if (!reviewSessionId || locked) {
      prevRedlinesRef.current = state.redlines;
      return;
    }
    const previous = prevRedlinesRef.current;
    const previousById = new Map(previous.map((r) => [r.id, r]));
    const currentById = new Map(state.redlines.map((r) => [r.id, r]));

    for (const redline of state.redlines) {
      const before = previousById.get(redline.id);
      if (!before) {
        addRedline(reviewSessionId, redline).catch((err: unknown) => console.error("Redline autosave (add) failed", err));
      } else if (JSON.stringify(before) !== JSON.stringify(redline)) {
        updateRedline(reviewSessionId, redline.id, redline).catch((err: unknown) => console.error("Redline autosave (update) failed", err));
      }
    }
    for (const redline of previous) {
      if (!currentById.has(redline.id)) {
        deleteRedline(reviewSessionId, redline.id).catch((err: unknown) => console.error("Redline autosave (delete) failed", err));
      }
    }
    prevRedlinesRef.current = state.redlines;
  }, [reviewSessionId, locked, state.redlines]);

  const syncedTranscriptCountRef = useRef(0);
  useEffect(() => {
    if (!reviewSessionId || !state.conversationId) return;
    const newTurns = state.transcript.slice(syncedTranscriptCountRef.current);
    if (newTurns.length === 0) return;
    syncedTranscriptCountRef.current = state.transcript.length;
    for (const turn of newTurns) {
      addTranscriptTurn(reviewSessionId, state.conversationId, turn).catch((err: unknown) =>
        console.error("Transcript autosave failed", err),
      );
    }
  }, [reviewSessionId, state.conversationId, state.transcript]);

  return null;
}
