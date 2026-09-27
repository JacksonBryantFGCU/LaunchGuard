import { useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import type { VoiceSessionFocus } from "@redline/shared";
import { useReviewState } from "../architecture-review/reviewStateStore.js";
import { isReviewLocked } from "../architecture-review/reviewState.js";
import { createVoiceSession } from "./api.js";
import { normalizeMessageEvent } from "./transcriptNormalization.js";

/**
 * Wires @elevenlabs/react's useConversation to Redline's review-state
 * reducer. All voice/call state lives in ReviewState (single source of
 * truth) - this hook only translates SDK events into dispatches and back.
 * Must be rendered under a <ConversationProvider>.
 *
 * `focus` is the learner's current Stress Lab selection (component/edge/
 * bottleneck/requirement, all already-visible text) - forwarded as-is to
 * the voice-session request so Alex can be asked about it contextually
 * (spec #14). Read fresh at call time via a ref so a later selection change
 * doesn't require restarting an in-progress `start` call.
 */
export function useArchitectConversation(scenarioSlug: string, focus?: VoiceSessionFocus) {
  const { state, dispatch } = useReviewState();
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      dispatch({ type: "VOICE_CONNECTED", conversationId, startedAt: new Date().toISOString() });
    },
    onDisconnect: () => {
      dispatch({ type: "VOICE_ENDED", endedAt: new Date().toISOString() });
    },
    onError: (message) => {
      dispatch({ type: "VOICE_ERROR", message });
    },
    onMessage: (payload) => {
      const turn = normalizeMessageEvent({ role: payload.role, message: payload.message, eventId: payload.event_id }, new Date().toISOString());
      if (turn) dispatch({ type: "VOICE_APPEND_TURN", turn });
    },
    onAgentResponseCorrection: (props) => {
      const correctedText = props.corrected_agent_response?.trim();
      if (correctedText) dispatch({ type: "VOICE_CORRECT_LAST_ARCHITECT_TURN", text: correctedText });
    },
  });

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (isReviewLocked(current)) return;
    if (current.voiceStatus === "connecting" || current.voiceStatus === "connected" || current.voiceStatus === "ending") return;

    dispatch({ type: "VOICE_CONNECTING" });

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      dispatch({ type: "VOICE_ERROR", message: "Microphone access was denied. Allow microphone access to talk with Alex." });
      return;
    }

    try {
      const session = await createVoiceSession(scenarioSlug, focusRef.current);
      conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: "websocket",
        dynamicVariables: session.dynamicVariables,
      });
    } catch {
      dispatch({ type: "VOICE_ERROR", message: "Unable to start the conversation. Please try again." });
    }
  }, [conversation, dispatch, scenarioSlug]);

  const end = useCallback(() => {
    const current = stateRef.current;
    if (current.voiceStatus !== "connecting" && current.voiceStatus !== "connected") return;
    dispatch({ type: "VOICE_END_REQUESTED" });
    conversation.endSession();
  }, [conversation, dispatch]);

  // Leaving the workspace (route change, unmount) while a call is active
  // must end it and stop the microphone - never leave it running silently.
  useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (current.voiceStatus === "connecting" || current.voiceStatus === "connected") {
        conversation.endSession();
        dispatch({ type: "VOICE_ENDED", endedAt: new Date().toISOString() });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    start,
    end,
    voiceStatus: state.voiceStatus,
    voiceError: state.voiceError,
    transcript: state.transcript,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted,
  };
}
