import { createContext, useContext } from "react";
import type { PublicReviewScenario } from "@redline/shared";
import type { useReviewSession } from "./useReviewSession.js";
import type { useDeveloperConversation } from "../voice/useDeveloperConversation.js";

export type ReviewSessionContextValue = ReturnType<typeof useReviewSession> &
  Pick<ReturnType<typeof useDeveloperConversation>, "startCall" | "endCall"> & { scenario: PublicReviewScenario };

export const ReviewSessionContext = createContext<ReviewSessionContextValue | null>(null);

export function useReviewSessionContext() {
  const ctx = useContext(ReviewSessionContext);
  if (!ctx) {
    throw new Error("useReviewSessionContext must be used within a ReviewSessionProvider");
  }
  return ctx;
}
