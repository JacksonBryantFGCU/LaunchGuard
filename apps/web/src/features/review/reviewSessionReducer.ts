import type { ReviewSessionAction, ReviewSessionState } from "./types.js";

export function createInitialReviewSessionState(scenarioSlug: string, firstFile: string): ReviewSessionState {
  return {
    scenarioSlug,
    selectedFile: firstFile,
    reviewedFiles: firstFile ? new Set([firstFile]) : new Set(),
    comments: [],
    reviewerNotes: "",
    decision: null,
    finalExplanation: "",
    submissionStatus: "draft",
    voiceStatus: "idle",
    transcript: [],
  };
}

export function isReviewLocked(state: ReviewSessionState): boolean {
  return state.submissionStatus === "submitting" || state.submissionStatus === "submitted";
}

export function reviewSessionReducer(state: ReviewSessionState, action: ReviewSessionAction): ReviewSessionState {
  switch (action.type) {
    case "SELECT_FILE": {
      if (isReviewLocked(state)) {
        return { ...state, selectedFile: action.file };
      }
      const reviewedFiles = new Set(state.reviewedFiles);
      reviewedFiles.add(action.file);
      return { ...state, selectedFile: action.file, reviewedFiles };
    }
    case "MARK_REVIEWED": {
      if (isReviewLocked(state)) return state;
      const reviewedFiles = new Set(state.reviewedFiles);
      reviewedFiles.add(action.file);
      return { ...state, reviewedFiles };
    }
    case "ADD_COMMENT":
      if (isReviewLocked(state)) return state;
      return { ...state, comments: [...state.comments, action.comment] };
    case "DELETE_COMMENT":
      if (isReviewLocked(state)) return state;
      return { ...state, comments: state.comments.filter((c) => c.id !== action.id) };
    case "SET_NOTES":
      if (isReviewLocked(state)) return state;
      return { ...state, reviewerNotes: action.notes };
    case "SET_DECISION":
      if (isReviewLocked(state)) return state;
      return { ...state, decision: action.decision };
    case "SET_FINAL_EXPLANATION":
      if (isReviewLocked(state)) return state;
      return { ...state, finalExplanation: action.text };
    case "SUBMIT_START":
      return { ...state, submissionStatus: "submitting", submissionError: undefined };
    case "SUBMIT_SUCCESS":
      return { ...state, submissionStatus: "submitted", reviewId: action.reviewId, submittedAt: action.submittedAt };
    case "SUBMIT_ERROR":
      return { ...state, submissionStatus: "error", submissionError: action.message };
    // Voice state transitions are never blocked by isReviewLocked: a call
    // that's already wrapping up when submission starts must still be able
    // to reach "ended" and keep its last transcript entries.
    case "SET_VOICE_STATUS":
      return { ...state, voiceStatus: action.status, voiceErrorMessage: action.errorMessage };
    case "ADD_TRANSCRIPT_ENTRY":
      return { ...state, transcript: [...state.transcript, action.entry] };
    case "SET_CONVERSATION_ID":
      return { ...state, conversationId: action.conversationId };
    default:
      return state;
  }
}
