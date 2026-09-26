import { useEffect, useRef, type ReactNode } from "react";
import type { PublicReviewScenario } from "@redline/shared";
import { useReviewSession } from "./useReviewSession.js";
import { ReviewSessionContext } from "./reviewSessionContextInternal.js";
import { useDeveloperConversation } from "../voice/useDeveloperConversation.js";

export function ReviewSessionProvider({ scenario, children }: { scenario: PublicReviewScenario; children: ReactNode }) {
  const filePaths = scenario.files.map((f) => f.path);
  const session = useReviewSession(scenario.slug, filePaths);
  const { setVoiceStatus, addTranscriptEntry, setConversationId } = session;

  const { startCall, endCall } = useDeveloperConversation({
    scenarioSlug: scenario.slug,
    onStatusChange: setVoiceStatus,
    onTranscriptEntry: addTranscriptEntry,
    onConversationId: setConversationId,
  });

  // Leaving the review entirely (not just switching between review/submit/
  // submitted) must not leave a live microphone session running.
  const voiceStatusRef = useRef(session.state.voiceStatus);
  useEffect(() => {
    voiceStatusRef.current = session.state.voiceStatus;
  }, [session.state.voiceStatus]);
  useEffect(() => {
    return () => {
      if (voiceStatusRef.current === "connected" || voiceStatusRef.current === "connecting") {
        void endCall();
      }
    };
  }, [endCall]);

  return (
    <ReviewSessionContext.Provider value={{ scenario, ...session, startCall, endCall }}>
      {children}
    </ReviewSessionContext.Provider>
  );
}
