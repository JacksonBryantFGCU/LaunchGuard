import type {
  ArchitectConversationTurn,
  ArchitectureRecommendation,
  ArchitectureRiskCategory,
  Redline,
  RedlineSeverity,
  RedlineTargetType,
  ReviewSession,
} from "@purgatory/shared";

export type SubmissionStatus = "draft" | "submitting" | "submitted" | "error";

export type VoiceStatus = "idle" | "connecting" | "connected" | "ending" | "ended" | "error";

// Plain, serializable review-session state - no React/React Flow references,
// no ElevenLabs SDK objects or tokens, so it can be persisted later without
// change.
export interface ReviewState {
  reviewSessionId: string | null;
  scenarioSlug: string;
  reviewedNodeIds: string[];
  reviewedEdgeIds: string[];
  redlines: Redline[];
  reviewerNotes: string;
  recommendation: ArchitectureRecommendation | null;
  finalRationale: string;
  submissionStatus: SubmissionStatus;
  reviewId: string | null;
  submittedAt: string | null;
  submissionError: string | null;
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  conversationId: string | null;
  conversationStartedAt: string | null;
  conversationEndedAt: string | null;
  transcript: ArchitectConversationTurn[];
}

export interface RedlineDraft {
  targetType: RedlineTargetType;
  targetId: string;
  category: ArchitectureRiskCategory;
  severity: RedlineSeverity;
  title: string;
  reasoning: string;
}

export type ReviewAction =
  | { type: "MARK_NODE_REVIEWED"; nodeId: string }
  | { type: "MARK_EDGE_REVIEWED"; edgeId: string }
  | { type: "ADD_REDLINE"; redline: Redline }
  | { type: "UPDATE_REDLINE"; id: string; draft: RedlineDraft }
  | { type: "DELETE_REDLINE"; id: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_RECOMMENDATION"; recommendation: ArchitectureRecommendation }
  | { type: "SET_FINAL_RATIONALE"; rationale: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; reviewId: string; submittedAt: string }
  | { type: "SUBMIT_ERROR"; message: string }
  | { type: "VOICE_CONNECTING" }
  | { type: "VOICE_CONNECTED"; conversationId: string; startedAt: string }
  | { type: "VOICE_END_REQUESTED" }
  | { type: "VOICE_ENDED"; endedAt: string }
  | { type: "VOICE_ERROR"; message: string }
  | { type: "VOICE_APPEND_TURN"; turn: ArchitectConversationTurn }
  | { type: "VOICE_CORRECT_LAST_ARCHITECT_TURN"; text: string }
  | { type: "HYDRATE_FROM_SESSION"; session: ReviewSession };

export function createInitialReviewState(scenarioSlug: string): ReviewState {
  return {
    reviewSessionId: null,
    scenarioSlug,
    reviewedNodeIds: [],
    reviewedEdgeIds: [],
    redlines: [],
    reviewerNotes: "",
    recommendation: null,
    finalRationale: "",
    submissionStatus: "draft",
    reviewId: null,
    submittedAt: null,
    submissionError: null,
    voiceStatus: "idle",
    voiceError: null,
    conversationId: null,
    conversationStartedAt: null,
    conversationEndedAt: null,
    transcript: [],
  };
}

/** Once submitted (or while a submission is in flight), the review is read-only. */
export function isReviewLocked(state: ReviewState): boolean {
  return state.submissionStatus === "submitted" || state.submissionStatus === "submitting";
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "MARK_NODE_REVIEWED":
      if (isReviewLocked(state)) return state;
      return state.reviewedNodeIds.includes(action.nodeId)
        ? state
        : { ...state, reviewedNodeIds: [...state.reviewedNodeIds, action.nodeId] };

    case "MARK_EDGE_REVIEWED":
      if (isReviewLocked(state)) return state;
      return state.reviewedEdgeIds.includes(action.edgeId)
        ? state
        : { ...state, reviewedEdgeIds: [...state.reviewedEdgeIds, action.edgeId] };

    case "ADD_REDLINE":
      if (isReviewLocked(state)) return state;
      return { ...state, redlines: [...state.redlines, action.redline] };

    case "UPDATE_REDLINE":
      if (isReviewLocked(state)) return state;
      return {
        ...state,
        redlines: state.redlines.map((r) => (r.id === action.id ? { ...r, ...action.draft } : r)),
      };

    case "DELETE_REDLINE":
      if (isReviewLocked(state)) return state;
      return { ...state, redlines: state.redlines.filter((r) => r.id !== action.id) };

    case "SET_NOTES":
      if (isReviewLocked(state)) return state;
      return { ...state, reviewerNotes: action.notes };

    case "SET_RECOMMENDATION":
      if (isReviewLocked(state)) return state;
      return { ...state, recommendation: action.recommendation };

    case "SET_FINAL_RATIONALE":
      if (isReviewLocked(state)) return state;
      return { ...state, finalRationale: action.rationale };

    case "SUBMIT_START":
      if (isReviewLocked(state)) return state;
      return { ...state, submissionStatus: "submitting", submissionError: null };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submissionStatus: "submitted",
        reviewId: action.reviewId,
        submittedAt: action.submittedAt,
        submissionError: null,
      };

    case "SUBMIT_ERROR":
      return { ...state, submissionStatus: "error", submissionError: action.message };

    case "VOICE_CONNECTING":
      // A submitted (or already in-flight) review cannot start a new conversation.
      if (isReviewLocked(state)) return state;
      if (state.voiceStatus === "connecting" || state.voiceStatus === "connected" || state.voiceStatus === "ending") return state;
      return { ...state, voiceStatus: "connecting", voiceError: null };

    case "VOICE_CONNECTED":
      return {
        ...state,
        voiceStatus: "connected",
        conversationId: action.conversationId,
        conversationStartedAt: action.startedAt,
        conversationEndedAt: null,
        voiceError: null,
      };

    case "VOICE_END_REQUESTED":
      if (state.voiceStatus !== "connecting" && state.voiceStatus !== "connected") return state;
      return { ...state, voiceStatus: "ending" };

    case "VOICE_ENDED":
      if (state.voiceStatus === "ended") return state;
      return { ...state, voiceStatus: "ended", conversationEndedAt: action.endedAt };

    case "VOICE_ERROR":
      return { ...state, voiceStatus: "error", voiceError: action.message };

    case "VOICE_APPEND_TURN":
      return state.transcript.some((t) => t.id === action.turn.id)
        ? state
        : { ...state, transcript: [...state.transcript, action.turn] };

    case "VOICE_CORRECT_LAST_ARCHITECT_TURN": {
      const lastArchitectIndex = state.transcript.findLastIndex((t) => t.speaker === "architect");
      if (lastArchitectIndex === -1) return state;
      const transcript = state.transcript.slice();
      transcript[lastArchitectIndex] = { ...transcript[lastArchitectIndex]!, text: action.text };
      return { ...state, transcript };
    }

    case "HYDRATE_FROM_SESSION": {
      const session = action.session;
      return {
        ...state,
        reviewSessionId: session.id,
        reviewedNodeIds: session.reviewedNodeIds,
        reviewedEdgeIds: session.reviewedEdgeIds,
        redlines: session.redlines,
        reviewerNotes: session.reviewerNotes,
        transcript: session.transcript,
        recommendation: session.recommendation,
        finalRationale: session.finalRationale ?? "",
        submissionStatus: session.status === "submitted" ? "submitted" : "draft",
        reviewId: session.status === "submitted" ? session.id : null,
        submittedAt: session.submittedAt,
      };
    }

    default:
      return state;
  }
}

export function redlinesForTarget(state: ReviewState, targetType: RedlineTargetType, targetId: string): Redline[] {
  return state.redlines.filter((r) => r.targetType === targetType && r.targetId === targetId);
}
