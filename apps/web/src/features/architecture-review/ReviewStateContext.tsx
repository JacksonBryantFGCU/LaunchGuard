import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { createInitialReviewState, reviewReducer } from "./reviewState.js";
import { ReviewStateContext } from "./reviewStateStore.js";
import { startOrResumeReviewSession, getReviewSession } from "../review-session/api.js";
import { ApiError } from "../../lib/api/client.js";
import { ReviewSessionAutosave } from "./ReviewSessionAutosave.js";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

// Mounted once per scenario. By default, starts (or resumes) the durable
// draft session for this user+scenario. When `sessionId` is provided (e.g.
// from history's "View Review" link), it loads that specific session
// instead - important for viewing an already-submitted review, which must
// never spawn a brand-new draft session.
export function ReviewStateProvider({
  scenarioSlug,
  sessionId,
  children,
}: {
  scenarioSlug: string;
  sessionId?: string | null;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reviewReducer, scenarioSlug, createInitialReviewState);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const value = useMemo(() => ({ state, dispatch }), [state]);

  useEffect(() => {
    let cancelled = false;
    const request = sessionId ? getReviewSession(sessionId) : startOrResumeReviewSession(scenarioSlug);
    request
      .then((session) => {
        if (cancelled) return;
        dispatch({ type: "HYDRATE_FROM_SESSION", session });
        setLoad({ status: "ready" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioSlug, sessionId]);

  if (load.status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  if (load.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load your review session: {load.message}
        </div>
      </main>
    );
  }

  return (
    <ReviewStateContext.Provider value={value}>
      <ReviewSessionAutosave />
      {children}
    </ReviewStateContext.Provider>
  );
}
