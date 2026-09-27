import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AddComponentModification } from "@redline/shared";
import type { PracticeScenarioOutletContext } from "./PracticeScenarioLayout.js";
import { useStressLab } from "../features/stress-lab/useStressLab.js";
import { useSelection } from "../features/architecture-review/useSelection.js";
import { ArchitectureCanvas } from "../components/architecture/ArchitectureCanvas.js";
import { TestSelector } from "../features/stress-lab/components/TestSelector.js";
import { ParameterForm } from "../features/stress-lab/components/ParameterForm.js";
import { MetricStrip } from "../features/stress-lab/components/MetricStrip.js";
import { RequirementsPanel } from "../features/stress-lab/components/RequirementsPanel.js";
import { BottleneckPanel } from "../features/stress-lab/components/BottleneckPanel.js";
import { TimelineControls } from "../features/stress-lab/components/TimelineControls.js";
import { RunHistoryPanel } from "../features/stress-lab/components/RunHistoryPanel.js";
import { ComparisonPanel } from "../features/stress-lab/components/ComparisonPanel.js";
import { InterventionEditorPanel } from "../features/stress-lab/components/InterventionEditorPanel.js";
import { RuntimeNodeInspector, RuntimeEdgeInspector } from "../features/stress-lab/components/RuntimeInspector.js";
import { mapFrameToNodeStates, mapFrameToEdgeStates } from "../features/stress-lab/runtimeMapping.js";
import { initialPlaybackState, play, pause, next, previous, restart, jumpTo, tick } from "../features/stress-lab/playback.js";
import { countRequirementStatuses, formatRequirementScore, primaryBottleneck } from "../features/stress-lab/resultSummary.js";
import { framesToChartSeries, nearestFrameIndexForTime, flattenEvents } from "../features/stress-lab/chartData.js";
import { TimeSeriesChart } from "../features/stress-lab/components/TimeSeriesChart.js";
import { EventTimelinePanel } from "../features/stress-lab/components/EventTimelinePanel.js";

const TICK_MS = 700;

export function StressLabPage() {
  const { system, practiceScenario, reviewSessionId } = useOutletContext<PracticeScenarioOutletContext>();
  const lab = useStressLab(reviewSessionId, practiceScenario.id);
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();
  const [view, setView] = useState<"lab" | "modify">("lab");
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [playback, setPlayback] = useState(() => initialPlaybackState(lab.activeResult?.frames.length ?? 0));

  useEffect(() => {
    // A new run means a new timeline - playback always restarts at frame 0 rather than carrying over the previous run's scrub position.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayback(initialPlaybackState(lab.activeResult?.frames.length ?? 0));
  }, [lab.activeResult]);

  useEffect(() => {
    if (playback.status !== "playing") return;
    const id = setInterval(() => setPlayback((s) => tick(s)), TICK_MS / speed);
    return () => clearInterval(id);
  }, [playback.status, speed]);

  const nodeIds = useMemo(() => system.nodes.map((n) => n.id), [system.nodes]);
  const edgeIds = useMemo(() => system.edges.map((e) => e.id), [system.edges]);
  const currentFrame = lab.activeResult?.frames[playback.currentFrameIndex];
  const nodeStressStates = currentFrame ? mapFrameToNodeStates(currentFrame, nodeIds) : undefined;
  const edgeStressStates = currentFrame ? mapFrameToEdgeStates(currentFrame, edgeIds) : undefined;

  const requirementLabelsById = useMemo(
    () => Object.fromEntries(system.requirements.map((r) => [r.id, r.target ? `${r.summary} (${r.target})` : r.summary])),
    [system.requirements],
  );

  const chartSeries = useMemo(() => (lab.activeResult ? framesToChartSeries(lab.activeResult.frames) : []), [lab.activeResult]);
  const timelineEvents = useMemo(() => (lab.activeResult ? flattenEvents(lab.activeResult.frames) : []), [lab.activeResult]);
  const scrubToTime = useCallback(
    (seconds: number) => {
      if (!lab.activeResult) return;
      setPlayback((s) => jumpTo(s, nearestFrameIndexForTime(lab.activeResult!.frames, seconds)));
    },
    [lab.activeResult],
  );

  if (lab.load.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true" aria-live="polite">
        <p className="mb-2 text-sm text-slate-400">Loading stress tests…</p>
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

  // Intentionally unsupported (a real 200 response with zero test
  // definitions) - distinct from the error state below, which is an
  // API/network failure (spec #10).
  if (lab.load.status === "unsupported") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-100">No Stress Lab for this scenario</h1>
        <p className="mt-2 text-sm text-slate-400">This scenario currently focuses on analysis rather than architecture simulation.</p>
      </main>
    );
  }

  if (lab.load.status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          <p>Stress tests could not be loaded.</p>
          <p className="mt-1 text-xs text-red-400">{lab.load.message}</p>
          <button type="button" onClick={lab.retryLoad} className="mt-3 rounded-md border border-red-800 px-3 py-1.5 text-xs font-semibold text-red-200 hover:border-red-600">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (view === "modify") {
    return (
      <InterventionEditorPanel
        interventions={lab.interventions}
        nodes={system.nodes}
        edges={system.edges}
        modifications={lab.modifications}
        onChange={lab.setModifications as (mods: AddComponentModification[]) => void}
        testLabel={lab.selectedTest?.label}
        baselinePassed={lab.baselineRun?.passed}
      />
    );
  }

  const hasRunSelectedTest = lab.runsForSelectedTest.length > 0;
  const isCustomParams = lab.selectedTest ? lab.selectedTest.parameters.some((p) => lab.parameterValues[p.id] !== p.defaultValue) : false;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stress Lab &middot; {practiceScenario.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">Results are deterministic architecture simulations, not live production traffic.</p>
        </div>
        <button type="button" onClick={() => setView("modify")} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500">
          Modify Architecture{lab.modifications.length > 0 ? ` (${lab.modifications.length})` : ""}
        </button>
      </header>

      {!lab.activeResult ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Test the Architecture</h1>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-400">
              <li>Choose a test</li>
              <li>Configure the conditions</li>
              <li>Run the baseline</li>
            </ol>
          </div>

          <TestSelector tests={lab.testDefinitions} selectedTestId={lab.selectedTest?.id} onSelect={lab.selectTest} />

          {lab.selectedTest && (
            <ParameterForm
              profile={lab.selectedTest}
              values={lab.parameterValues}
              onChange={lab.setParameter}
              onReset={lab.resetParameters}
              error={lab.parameterError}
              isCustom={isCustomParams}
            />
          )}

          {lab.runRequestStatus.status === "error" && (
            <p role="alert" className="text-xs text-red-400">
              {lab.runRequestStatus.message}{" "}
              <button type="button" onClick={lab.runTest} className="underline">
                Try Again
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={lab.runTest}
            disabled={lab.runRequestStatus.status === "submitting"}
            className="self-start rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {lab.runRequestStatus.status === "submitting" ? "Running…" : hasRunSelectedTest ? "Re-run Test" : "Run Baseline Test"}
          </button>

          <RunHistoryPanel runs={lab.runsForSelectedTest} activeRunId={undefined} onSelect={() => {}} />
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
            <div className="min-h-[360px]">
              <ArchitectureCanvas
                nodes={system.nodes}
                edges={system.edges}
                selection={selection}
                onSelectNode={selectNode}
                onSelectEdge={selectEdge}
                onClearSelection={clearSelection}
                reviewedNodeIds={new Set()}
                reviewedEdgeIds={new Set()}
                redlineCountByNodeId={{}}
                redlineCountByEdgeId={{}}
                nodeStressStates={nodeStressStates}
                edgeStressStates={edgeStressStates}
              />
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto border-l border-slate-800 p-4">
              <MetricStrip metrics={currentFrame?.systemMetrics ?? {}} />

              {selection?.kind === "node" && currentFrame && (
                <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  {(() => {
                    const state = currentFrame.nodeStates.find((n) => n.nodeId === selection.id);
                    const label = system.nodes.find((n) => n.id === selection.id)?.label ?? selection.id;
                    return state ? <RuntimeNodeInspector label={label} state={state} /> : <p className="text-xs text-slate-500">No runtime data for {label} at this point.</p>;
                  })()}
                </div>
              )}
              {selection?.kind === "edge" && currentFrame && (
                <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  {(() => {
                    const state = currentFrame.edgeStates.find((e) => e.edgeId === selection.id);
                    const edge = system.edges.find((e) => e.id === selection.id);
                    const label = edge ? `${system.nodes.find((n) => n.id === edge.source)?.label ?? edge.source} -> ${system.nodes.find((n) => n.id === edge.target)?.label ?? edge.target}` : selection.id;
                    return state ? <RuntimeEdgeInspector label={label} state={state} /> : <p className="text-xs text-slate-500">No runtime data for this connection at this point.</p>;
                  })()}
                </div>
              )}

              <RequirementsPanel requirements={lab.activeResult.requirementResults} labelsById={requirementLabelsById} />
              <BottleneckPanel
                bottlenecks={lab.activeResult.bottlenecks}
                onSelect={(targetType, targetId) => (targetType === "node" ? selectNode(targetId) : selectEdge(targetId))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-800 p-4">
            <TimelineControls
              frames={lab.activeResult.frames}
              playback={playback}
              speed={speed}
              onSpeedChange={setSpeed}
              onPlay={() => setPlayback((s) => play(s))}
              onPause={() => setPlayback((s) => pause(s))}
              onNext={() => setPlayback((s) => next(s))}
              onPrevious={() => setPlayback((s) => previous(s))}
              onRestart={() => setPlayback((s) => restart(s))}
              onScrub={(i) => setPlayback((s) => jumpTo(s, i))}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TimeSeriesChart data={chartSeries} dataKey="trafficRequestsPerMinute" label="Traffic" unit="req/min" color="#38bdf8" currentTimeSeconds={currentFrame?.timestampSeconds ?? 0} onScrub={scrubToTime} />
              <TimeSeriesChart data={chartSeries} dataKey="checkoutP95Ms" label="Simulated p95" unit="ms" color="#f59e0b" currentTimeSeconds={currentFrame?.timestampSeconds ?? 0} onScrub={scrubToTime} />
              <TimeSeriesChart data={chartSeries} dataKey="dbUtilizationPercent" label="DB Utilization" unit="%" color="#f97316" currentTimeSeconds={currentFrame?.timestampSeconds ?? 0} onScrub={scrubToTime} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-4">
                <RunCompletionSummary passed={lab.activeResult.passed} requirements={lab.activeResult.requirementResults} bottlenecks={lab.activeResult.bottlenecks} onModify={() => setView("modify")} />

                {lab.comparisonRun && lab.activeRun && (
                  <ComparisonPanel baseline={lab.comparisonRun} current={lab.activeRun} isStrict={lab.runIsStrictComparison} />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event Timeline</p>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  <EventTimelinePanel events={timelineEvents} onJumpTo={scrubToTime} />
                </div>
              </div>
            </div>

            <RunHistoryPanel
              runs={lab.runsForSelectedTest}
              activeRunId={lab.activeRun?.id}
              onSelect={(run) => {
                // Selecting a historical run shows its persisted summary; frames replay only for the just-computed activeResult (spec #43).
                if (run.id === lab.activeRun?.id) return;
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RunCompletionSummary({
  passed,
  requirements,
  bottlenecks,
  onModify,
}: {
  passed: boolean;
  requirements: Parameters<typeof countRequirementStatuses>[0];
  bottlenecks: Parameters<typeof primaryBottleneck>[0];
  onModify: () => void;
}) {
  const counts = countRequirementStatuses(requirements);
  const bottleneck = primaryBottleneck(bottlenecks);
  return (
    <div className={`rounded-lg border p-4 ${passed ? "border-emerald-900 bg-emerald-950/20" : "border-slate-800 bg-slate-900"}`}>
      <p className="text-sm font-semibold text-slate-100">{passed ? "SYSTEM PASSES THIS TEST" : "DESIGN NEEDS WORK"}</p>
      <p className="mt-1 text-xs text-slate-400">{formatRequirementScore(counts)} requirements satisfied</p>
      {!passed && bottleneck && (
        <p className="mt-1 text-xs text-slate-400">
          Primary bottleneck: <span className="text-slate-200">{bottleneck.targetId}</span> ({bottleneck.metric})
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onModify} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">
          Modify Architecture
        </button>
      </div>
    </div>
  );
}
