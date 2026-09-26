import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { StressTestReveal } from "@redline/shared";
import { useReviewState } from "../features/architecture-review/reviewStateStore.js";
import { useSelection } from "../features/architecture-review/useSelection.js";
import { getStressTests } from "../features/stress-test/api.js";
import { ApiError } from "../lib/api/client.js";
import {
  createInitialStressTestSimulatorState,
  stressTestSimulatorReducer,
} from "../features/stress-test/stressTestState.js";
import { getReviewSession, saveStressProgress } from "../features/review-session/api.js";
import { computeStressOverlay } from "../features/stress-test/overlayMapping.js";
import { ArchitectureCanvas } from "../components/architecture/ArchitectureCanvas.js";
import { StressTestList } from "../components/stress-test/StressTestList.js";
import { EventTimeline } from "../components/stress-test/EventTimeline.js";
import { ImpactPanel } from "../components/stress-test/ImpactPanel.js";
import type { ReviewOutletContext } from "./ArchitectureReviewLayout.js";

const STEP_DURATION_MS = 2200;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; tests: StressTestReveal[] };

export function StressTestSimulatorPage() {
  const { scenario } = useOutletContext<ReviewOutletContext>();
  const { state: reviewState } = useReviewState();
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [simState, dispatch] = useReducer(stressTestSimulatorReducer, undefined, createInitialStressTestSimulatorState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reviewId = reviewState.submissionStatus === "submitted" ? reviewState.reviewId : null;

  useEffect(() => {
    if (!reviewId) return;
    let cancelled = false;
    getStressTests(reviewId)
      .then((result) => {
        if (!cancelled) setLoad({ status: "success", tests: result.tests });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  // Restores previously-completed tests (e.g. after a refresh) from the
  // durable session, so returning to this page doesn't re-run finished work.
  useEffect(() => {
    if (!reviewId) return;
    let cancelled = false;
    getReviewSession(reviewId)
      .then((session) => {
        if (cancelled) return;
        const completed = session.stressProgress
          .filter((p): p is typeof p & { status: "passed" | "failed" } => p.status === "passed" || p.status === "failed")
          .map((p) => ({ stressTestId: p.stressTestId, status: p.status }));
        if (completed.length > 0) dispatch({ type: "HYDRATE_PROGRESS", completed });
      })
      .catch((err: unknown) => console.error("Failed to restore stress-test progress", err));
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  // Persists progress as the user plays through a test, so it survives a
  // refresh - fires on every step/status change, not just on completion.
  useEffect(() => {
    if (!reviewId || !simState.selectedTestId) return;
    const status = simState.testStatuses[simState.selectedTestId] ?? "not_started";
    if (status === "not_started") return;
    saveStressProgress(reviewId, {
      stressTestId: simState.selectedTestId,
      status,
      currentStep: simState.currentStepIndex,
      completedAt: status === "passed" || status === "failed" ? new Date().toISOString() : null,
    }).catch((err: unknown) => console.error("Stress-test progress autosave failed", err));
  }, [reviewId, simState.selectedTestId, simState.testStatuses, simState.currentStepIndex]);

  const tests = load.status === "success" ? load.tests : [];
  const selectedTest = tests.find((t) => t.id === simState.selectedTestId) ?? null;
  const currentStep = selectedTest ? (selectedTest.steps[simState.currentStepIndex] ?? null) : null;

  // Automatic playback timer - cleaned up on pause, on switching tests, and on unmount.
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!simState.isPlaying || !selectedTest) return;
    timerRef.current = setInterval(() => {
      dispatch({ type: "ADVANCE_STEP", stepCount: selectedTest.steps.length, finalStatus: selectedTest.status });
    }, STEP_DURATION_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [simState.isPlaying, simState.selectedTestId, selectedTest]);

  const overlay = useMemo(
    () =>
      computeStressOverlay(
        currentStep,
        scenario.nodes.map((n) => n.id),
        scenario.edges.map((e) => e.id),
      ),
    [currentStep, scenario.nodes, scenario.edges],
  );

  if (!reviewId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-slate-300">
          Submit your review before running architecture stress tests.{" "}
          <Link to={`/app/review/${scenario.slug}`} className="underline underline-offset-4">
            Return to architecture
          </Link>
        </p>
      </main>
    );
  }

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
          Couldn't load stress tests: {load.message}
        </div>
      </main>
    );
  }

  const testStatus = simState.selectedTestId ? (simState.testStatuses[simState.selectedTestId] ?? "not_started") : "not_started";
  const isComplete = selectedTest !== null && (testStatus === "passed" || testStatus === "failed");
  const allTestsCompleted = tests.length > 0 && simState.completedTestIds.length === tests.length;

  function handleTogglePlay() {
    if (!simState.selectedTestId) return;
    if (simState.isPlaying) {
      dispatch({ type: "PAUSE" });
    } else if (testStatus === "not_started") {
      dispatch({ type: "START_TEST" });
    } else {
      dispatch({ type: "RESUME" });
    }
  }

  function handleNextStep() {
    if (!selectedTest) return;
    if (testStatus === "not_started") {
      dispatch({ type: "START_TEST" });
      return;
    }
    dispatch({ type: "PAUSE" });
    dispatch({ type: "ADVANCE_STEP", stepCount: selectedTest.steps.length, finalStatus: selectedTest.status });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Redline · Architecture Stress Test</h1>
        <p className="text-xs text-slate-500">
          {scenario.title} · {scenario.reviewCode}
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_1fr_320px]">
        <StressTestList
          tests={tests}
          statuses={simState.testStatuses}
          selectedTestId={simState.selectedTestId}
          onSelect={(testId) => dispatch({ type: "SELECT_TEST", testId })}
        />

        <div className="min-h-0">
          <ArchitectureCanvas
            nodes={scenario.nodes}
            edges={scenario.edges}
            selection={selection}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
            onClearSelection={clearSelection}
            reviewedNodeIds={new Set()}
            reviewedEdgeIds={new Set()}
            redlineCountByNodeId={{}}
            redlineCountByEdgeId={{}}
            nodeStressStates={overlay.nodeStates}
            edgeStressStates={overlay.edgeStates}
          />
        </div>

        <ImpactPanel scenario={scenario} test={selectedTest} step={currentStep} isComplete={isComplete} />
      </div>

      <EventTimeline
        test={selectedTest}
        currentStepIndex={simState.currentStepIndex}
        isPlaying={simState.isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextStep}
        onRestart={() => dispatch({ type: "RESTART_TEST" })}
      />

      <footer className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <p className="text-xs text-slate-500">
          {simState.completedTestIds.length} / {tests.length} tests completed
        </p>
        {allTestsCompleted ? (
          <span
            title="Review evaluation is a future phase."
            aria-disabled="true"
            className="cursor-not-allowed rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-500"
          >
            Continue to Review Evaluation (coming soon)
          </span>
        ) : (
          <Link to={`/app/review/${scenario.slug}`} className="text-xs font-medium text-slate-300 underline underline-offset-4">
            Return to architecture
          </Link>
        )}
      </footer>
    </div>
  );
}
