import { useMemo, useReducer } from "react";
import type { ReviewDecision, TranscriptEntry } from "@redline/shared";
import type { VoiceStatus } from "../voice/types.js";
import type { ReviewComment } from "./types.js";
import { createInitialReviewSessionState, isReviewLocked, reviewSessionReducer } from "./reviewSessionReducer.js";

export function useReviewSession(scenarioSlug: string, filePaths: string[]) {
  const [state, dispatch] = useReducer(reviewSessionReducer, undefined, () =>
    createInitialReviewSessionState(scenarioSlug, filePaths[0] ?? ""),
  );

  const commentsForSelectedFile = useMemo(
    () => state.comments.filter((c) => c.file === state.selectedFile).sort((a, b) => a.startLine - b.startLine),
    [state.comments, state.selectedFile],
  );

  return {
    state,
    isLocked: isReviewLocked(state),
    commentsForSelectedFile,
    selectFile: (file: string) => dispatch({ type: "SELECT_FILE", file }),
    markReviewed: (file: string) => dispatch({ type: "MARK_REVIEWED", file }),
    addComment: (comment: ReviewComment) => dispatch({ type: "ADD_COMMENT", comment }),
    deleteComment: (id: string) => dispatch({ type: "DELETE_COMMENT", id }),
    setNotes: (notes: string) => dispatch({ type: "SET_NOTES", notes }),
    setDecision: (decision: ReviewDecision) => dispatch({ type: "SET_DECISION", decision }),
    setFinalExplanation: (text: string) => dispatch({ type: "SET_FINAL_EXPLANATION", text }),
    submitStart: () => dispatch({ type: "SUBMIT_START" }),
    submitSuccess: (reviewId: string, submittedAt: string) => dispatch({ type: "SUBMIT_SUCCESS", reviewId, submittedAt }),
    submitError: (message: string) => dispatch({ type: "SUBMIT_ERROR", message }),
    setVoiceStatus: (status: VoiceStatus, errorMessage?: string) => dispatch({ type: "SET_VOICE_STATUS", status, errorMessage }),
    addTranscriptEntry: (entry: TranscriptEntry) => dispatch({ type: "ADD_TRANSCRIPT_ENTRY", entry }),
    setConversationId: (conversationId: string) => dispatch({ type: "SET_CONVERSATION_ID", conversationId }),
  };
}
