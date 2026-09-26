import { useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import type { TranscriptEntry } from "@redline/shared";
import { requestVoiceSession } from "./api.js";
import { createTranscriptEntry } from "./transcript.js";
import { ApiError } from "../../lib/api/client.js";
import type { VoiceStatus } from "./types.js";

interface UseDeveloperConversationOptions {
  scenarioSlug: string;
  onStatusChange: (status: VoiceStatus, errorMessage?: string) => void;
  onTranscriptEntry: (entry: TranscriptEntry) => void;
  onConversationId: (id: string) => void;
}

function errorMessageFrom(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Voice conversation error.";
}

// Wraps @elevenlabs/react's useConversation so no other component talks to
// the SDK directly. Callers (ReviewSessionContext) own where the resulting
// status/transcript/conversationId actually live.
export function useDeveloperConversation({
  scenarioSlug,
  onStatusChange,
  onTranscriptEntry,
  onConversationId,
}: UseDeveloperConversationOptions) {
  const startingRef = useRef(false);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      onStatusChange("connected");
      onConversationId(conversationId);
    },
    onDisconnect: () => onStatusChange("ended"),
    onMessage: ({ message, source }) => {
      onTranscriptEntry(createTranscriptEntry(source, message));
    },
    onError: (message) => onStatusChange("error", message),
  });

  const startCall = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    onStatusChange("connecting");

    try {
      const session = await requestVoiceSession(scenarioSlug);
      await conversation.startSession({
        signedUrl: session.signedUrl,
        dynamicVariables: session.dynamicVariables,
      });
    } catch (err) {
      onStatusChange("error", errorMessageFrom(err));
    } finally {
      startingRef.current = false;
    }
  }, [scenarioSlug, conversation, onStatusChange]);

  const endCall = useCallback(async () => {
    onStatusChange("ending");
    try {
      await conversation.endSession();
    } finally {
      onStatusChange("ended");
    }
  }, [conversation, onStatusChange]);

  return { startCall, endCall, isActive: conversation.status === "connected" || conversation.status === "connecting" };
}
