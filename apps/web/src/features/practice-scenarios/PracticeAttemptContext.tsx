import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PracticeResponseDraft, PracticeScenarioAttemptView } from "@purgatory/shared";
import { ApiError } from "../../lib/api/client.js";
import { isResponseLocked, nextAutosaveStatus, type AutosaveStatus } from "./practiceWorkflow.js";
import { PracticeAttemptReactContext, type PracticeAttemptContextValue } from "./practiceAttemptStore.js";
import * as practiceApi from "./api.js";

const DRAFT_SAVE_DEBOUNCE_MS = 500;

function sameResponse(a: PracticeResponseDraft, b: PracticeResponseDraft): boolean {
  return (
    a.diagnosis === b.diagnosis &&
    a.investigationPlan === b.investigationPlan &&
    a.immediateAction === b.immediateAction &&
    a.architectureDecision === b.architectureDecision &&
    a.tradeoff === b.tradeoff &&
    a.severity === b.severity &&
    a.confidence === b.confidence
  );
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

export function PracticeAttemptProvider({
  reviewSessionId,
  practiceScenarioId,
  children,
}: {
  reviewSessionId: string;
  practiceScenarioId: string;
  children: ReactNode;
}) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<PracticeScenarioAttemptView | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedResponseRef = useRef<PracticeResponseDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resets loading state when reviewSessionId/practiceScenarioId change,
    // not just on mount (initial state is already "loading").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoad({ status: "loading" });
    practiceApi
      .startPracticeScenarioAttempt(reviewSessionId, practiceScenarioId)
      .then(() => practiceApi.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId))
      .then((fetched) => {
        if (cancelled) return;
        lastSavedResponseRef.current = fetched.response;
        setView(fetched);
        setLoad({ status: "ready" });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [reviewSessionId, practiceScenarioId]);

  // Debounced draft autosave - mirrors ReviewSessionAutosave's pattern.
  useEffect(() => {
    if (!view || isResponseLocked(view.status)) return;
    if (lastSavedResponseRef.current && sameResponse(lastSavedResponseRef.current, view.response)) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      setAutosaveStatus((s) => nextAutosaveStatus(s, "start"));
      practiceApi
        .savePracticeResponseDraft(reviewSessionId, practiceScenarioId, {
          diagnosis: view.response.diagnosis,
          investigationPlan: view.response.investigationPlan,
          immediateAction: view.response.immediateAction,
          architectureDecision: view.response.architectureDecision,
          tradeoff: view.response.tradeoff,
          ...(view.response.severity ? { severity: view.response.severity } : {}),
          ...(view.response.confidence ? { confidence: view.response.confidence } : {}),
        })
        .then(() => {
          lastSavedResponseRef.current = view.response;
          setAutosaveStatus((s) => nextAutosaveStatus(s, "success"));
        })
        .catch(() => setAutosaveStatus((s) => nextAutosaveStatus(s, "failure")));
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [view, reviewSessionId, practiceScenarioId]);

  if (load.status === "loading" || !view) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  if (load.status === "error") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load this scenario: {load.message}
        </div>
      </main>
    );
  }

  const value: PracticeAttemptContextValue = {
    view,
    autosaveStatus,
    updateDraft: (patch) => {
      setView((prev) => (prev ? { ...prev, response: { ...prev.response, ...patch } } : prev));
    },
    setRequirements: async (requirementIds) => {
      setView(await practiceApi.setPracticeRequirements(reviewSessionId, practiceScenarioId, requirementIds));
    },
    addEvidence: async (input) => {
      setView(await practiceApi.addPracticeEvidence(reviewSessionId, practiceScenarioId, input));
    },
    removeEvidence: async (evidenceId) => {
      setView(await practiceApi.removePracticeEvidence(reviewSessionId, practiceScenarioId, evidenceId));
    },
    setSelectedEvidence: async (evidenceIds) => {
      setView(await practiceApi.setPracticeResponseEvidence(reviewSessionId, practiceScenarioId, evidenceIds));
    },
    submit: async () => {
      const { evaluation } = await practiceApi.submitPracticeScenarioResponse(reviewSessionId, practiceScenarioId);
      setView(await practiceApi.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId));
      return evaluation;
    },
    markConsequenceReady: async () => {
      setView(await practiceApi.markPracticeScenarioConsequenceReady(reviewSessionId, practiceScenarioId));
    },
    complete: async () => {
      setView(await practiceApi.completePracticeScenarioAttempt(reviewSessionId, practiceScenarioId));
    },
  };

  return <PracticeAttemptReactContext.Provider value={value}>{children}</PracticeAttemptReactContext.Provider>;
}
