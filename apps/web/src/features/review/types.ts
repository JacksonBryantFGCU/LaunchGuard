import type { ReviewDecision, TranscriptEntry } from "@redline/shared";
import type { VoiceStatus } from "../voice/types.js";

export interface ReviewComment {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  body: string;
  createdAt: string;
}

export type SubmissionStatus = "draft" | "submitting" | "submitted" | "error";

export interface ReviewSessionState {
  scenarioSlug: string;
  selectedFile: string;
  reviewedFiles: Set<string>;
  comments: ReviewComment[];
  reviewerNotes: string;
  decision: ReviewDecision | null;
  finalExplanation: string;
  submissionStatus: SubmissionStatus;
  submissionError?: string;
  reviewId?: string;
  submittedAt?: string;
  voiceStatus: VoiceStatus;
  voiceErrorMessage?: string;
  conversationId?: string;
  transcript: TranscriptEntry[];
}

export type ReviewSessionAction =
  | { type: "SELECT_FILE"; file: string }
  | { type: "MARK_REVIEWED"; file: string }
  | { type: "ADD_COMMENT"; comment: ReviewComment }
  | { type: "DELETE_COMMENT"; id: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_DECISION"; decision: ReviewDecision }
  | { type: "SET_FINAL_EXPLANATION"; text: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; reviewId: string; submittedAt: string }
  | { type: "SUBMIT_ERROR"; message: string }
  | { type: "SET_VOICE_STATUS"; status: VoiceStatus; errorMessage?: string }
  | { type: "ADD_TRANSCRIPT_ENTRY"; entry: TranscriptEntry }
  | { type: "SET_CONVERSATION_ID"; conversationId: string };
