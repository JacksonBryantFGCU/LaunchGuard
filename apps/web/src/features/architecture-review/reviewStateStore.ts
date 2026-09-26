import { createContext, useContext, type Dispatch } from "react";
import type { ReviewAction, ReviewState } from "./reviewState.js";

export const ReviewStateContext = createContext<{ state: ReviewState; dispatch: Dispatch<ReviewAction> } | null>(null);

export function useReviewState() {
  const ctx = useContext(ReviewStateContext);
  if (!ctx) throw new Error("useReviewState must be used within a ReviewStateProvider");
  return ctx;
}
