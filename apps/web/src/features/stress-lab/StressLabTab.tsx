import { useState } from "react";
import type { AddComponentModification, PracticeScenario, PublicArchitectureScenario, SimulationBottleneck } from "@redline/shared";
import { ArchitectureCanvas } from "../../components/architecture/ArchitectureCanvas.js";
import { TestSelector } from "./components/TestSelector.js";
import { ParameterForm } from "./components/ParameterForm.js";
import { MetricStrip } from "./components/MetricStrip.js";
import { RequirementsPanel } from "./components/RequirementsPanel.js";
import { BottleneckPanel } from "./components/BottleneckPanel.js";
import { TimelineControls } from "./components/TimelineControls.js";
import { RunHistoryPanel } from "./components/RunHistoryPanel.js";
import { InterventionEditorPanel } from "./components/InterventionEditorPanel.js";
import { RuntimeNodeInspector, RuntimeEdgeInspector } from "./components/RuntimeInspector.js";
import { mapFrameToNodeStates, mapFrameToEdgeStates, mapFrameToNodeMetrics } from "./runtimeMapping.js";
import { countRequirementStatuses, formatRequirementScore, primaryBottleneck, correlateRequirementBottleneck } from "./resultSummary.js";
import { framesToChartSeries, nearestFrameIndexForTime, flattenEvents, selectPrimaryChartKeys } from "./chartData.js";
import { AnalysisDrawer } from "./components/AnalysisDrawer.js";
import { deriveLabMode } from "./labMode.js";
import { selectLiveMetricKeys } from "./liveMetricSelection.js";
import type { StressLabTabState } from "./useStressLabTabState.js";
import type { StressLabVoiceFocus } from "../voice/architectContext.js";
import { buildStressLabVoiceContext } from "../voice/architectContext.js";

export interface ArchitectFocusRequest {
  focusLabel: string;
  context: StressLabVoiceFocus;
  bottleneck?: { metric: string; targetId: string };
}

function AskAlexButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-md border border-sky-800 bg-sky-950/40 px-2.5 py-1.5 text-left text-xs font-medium text-sky-300 hover:border-sky-600"
    >
      Ask Alex about {label}
    </button>
  );
}

/**
 * The Stress Lab, rendered as one of PracticeInvestigationPage's tabs
 * (spec #1) rather than a separate route/page - the scenario header and
 * primary nav from that page stay visible the entire time, including while
 * in Design Mode. All state (selected test, parameters, playback, design
 * modifications, completed runs) lives in the `state` prop, owned by
 * useStressLabTabState at the page level, so switching tabs and back never
 * loses it (spec #17).
 */
export function StressLabTab({
  system,
  practiceScenario,
  state,
  onAskArchitect,
}: {
  system: PublicArchitectureScenario;
  practiceScenario: PracticeScenario;
  state: StressLabTabState;
  onAskArchitect: (focus: ArchitectFocusRequest) => void;
}) {
  const { lab, selection, selectNode, selectEdge, clearSelection, view, setView, speed, setSpeed, playback } = state;
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const mode = deriveLabMode(!!lab.activeResult, playback);
  const liveMetricKeys = lab.selectedTest ? selectLiveMetricKeys(lab.selectedTest.category) : undefined;

  const nodeIds = system.nodes.map((n) => n.id);
  const edgeIds = system.edges.map((e) => e.id);
  const currentFrame = lab.activeResult?.frames[playback.currentFrameIndex];
  const nodeStressStates = currentFrame ? mapFrameToNodeStates(currentFrame, nodeIds) : undefined;
  const edgeStressStates = currentFrame ? mapFrameToEdgeStates(currentFrame, edgeIds) : undefined;
  const nodeRuntimeMetrics = currentFrame ? mapFrameToNodeMetrics(currentFrame, nodeIds) : undefined;

  const requirementLabelsById = Object.fromEntries(
    system.requirements.map((r) => [r.id, r.target ? `${r.summary} (${r.target})` : r.summary]),
  );

  const chartSeries = lab.activeResult ? framesToChartSeries(lab.activeResult.frames) : [];
  const timelineEvents = lab.activeResult ? flattenEvents(lab.activeResult.frames) : [];
  const primaryChartKeys = lab.activeResult ? selectPrimaryChartKeys(chartSeries, lab.activeResult.bottlenecks) : [];
  const scrubToTime = (seconds: number) => {
    if (!lab.activeResult) return;
    state.onScrub(nearestFrameIndexForTime(lab.activeResult.frames, seconds));
  };

  const [selectedRequirementId, setSelectedRequirementId] = useState<string | undefined>(undefined);
  const selectedRequirementBottleneck =
    lab.activeResult && selectedRequirementId
      ? correlateRequirementBottleneck(
          lab.activeResult.requirementResults.find((r) => r.requirementId === selectedRequirementId)!,
          lab.activeResult.bottlenecks,
        )
      : undefined;

  function askAlexAboutNode(nodeId: string) {
    const node = system.nodes.find((n) => n.id === nodeId);
    const label = node?.label ?? nodeId;
    onAskArchitect({
      focusLabel: label,
      context: buildStressLabVoiceContext({ focusLabel: label }),
      bottleneck: currentFrame ? { metric: "", targetId: nodeId } : undefined,
    });
  }

  function askAlexAboutEdge(edgeId: string) {
    const edge = system.edges.find((e) => e.id === edgeId);
    const label = edge
      ? `${system.nodes.find((n) => n.id === edge.source)?.label ?? edge.source} → ${system.nodes.find((n) => n.id === edge.target)?.label ?? edge.target}`
      : edgeId;
    onAskArchitect({ focusLabel: label, context: buildStressLabVoiceContext({ focusLabel: label }) });
  }

  function askAlexAboutBottleneck(b: SimulationBottleneck) {
    const label = `the ${b.metric} bottleneck on ${b.targetId}`;
    onAskArchitect({
      focusLabel: label,
      context: buildStressLabVoiceContext({
        focusLabel: b.targetId,
        bottleneckSummary: `${b.metric}: ${b.observed} (threshold ${b.threshold})`,
      }),
      bottleneck: { metric: b.metric, targetId: b.targetId },
    });
  }

  function askAlexAboutRequirement(requirementId: string, bottleneck: SimulationBottleneck | undefined) {
    const req = lab.activeResult?.requirementResults.find((r) => r.requirementId === requirementId);
    const label = requirementLabelsById[requirementId] ?? requirementId;
    onAskArchitect({
      focusLabel: `the design assumptions behind "${label}"`,
      context: buildStressLabVoiceContext({
        focusLabel: label,
        requirementSummary: req ? `${label}: ${req.status.toUpperCase()} - ${req.explanation}` : undefined,
        bottleneckSummary: bottleneck ? `${bottleneck.metric}: ${bottleneck.observed} (threshold ${bottleneck.threshold})` : undefined,
      }),
      bottleneck: bottleneck ? { metric: bottleneck.metric, targetId: bottleneck.targetId } : undefined,
    });
  }

  if (lab.load.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true" aria-live="polite">
        <p className="mb-2 text-sm text-slate-400">Loading stress tests…</p>
        <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
      </main>
    );
  }

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

  const hasRunSelectedTest = lab.runsForSelectedTest.length > 0;
  const isCustomParams = lab.selectedTest ? lab.selectedTest.parameters.some((p) => lab.parameterValues[p.id] !== p.defaultValue) : false;
  const baselineCounts = lab.baselineRun ? countRequirementStatuses(lab.baselineRun.requirementResults) : undefined;

  // Design Mode (spec #10): an inline panel alongside the still-visible
  // scenario chrome/requirements, not a full-screen takeover of the Stress
  // Lab that would lose the baseline/test/parameter context.
  if (view === "modify") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Design Mode</p>
            <p className="mt-0.5 text-sm text-slate-200">
              Designing for: <span className="font-semibold">{lab.selectedTest?.label ?? "no test selected"}</span>
              {baselineCounts && <span className="ml-2 text-slate-400">Baseline: {formatRequirementScore(baselineCounts)}</span>}
            </p>
          </div>
          <button type="button" onClick={() => setView("lab")} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">
            Back to Stress Lab
          </button>
        </div>
        <div className="scroll-panel grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[7fr_3fr]">
          <InterventionEditorPanel
            interventions={lab.interventions}
            nodes={system.nodes}
            edges={system.edges}
            modifications={lab.modifications}
            onChange={lab.setModifications as (mods: AddComponentModification[]) => void}
            testLabel={lab.selectedTest?.label}
            baselinePassed={lab.baselineRun?.passed}
          />
          {lab.activeResult && (
            <div className="border-l border-slate-800 p-4">
              <RequirementsPanel requirements={lab.activeResult.requirementResults} labelsById={requirementLabelsById} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stress Lab &middot; {practiceScenario.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">Results are deterministic architecture simulations, not live production traffic.</p>
        </div>
        {lab.activeResult && (
          <button type="button" onClick={() => setView("modify")} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500">
            Modify Architecture{lab.modifications.length > 0 ? ` (${lab.modifications.length})` : ""}
          </button>
        )}
      </div>

      {!lab.activeResult ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr]">
          {/* Test choice lives in its own narrow rail (spec: horizontal layout, not one long stacked column) so picking a test never requires scrolling past the conditions form. */}
          <div className="scroll-panel flex flex-col gap-4 overflow-y-auto border-b border-slate-800 p-6 lg:border-b-0 lg:border-r">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Test the Architecture</h1>
              <ol className="mt-2 list-decimal pl-5 text-sm text-slate-400">
                <li>Choose a test</li>
                <li>Configure the conditions</li>
                <li>Run the baseline</li>
              </ol>
            </div>
            <TestSelector tests={lab.testDefinitions} selectedTestId={lab.selectedTest?.id} onSelect={lab.selectTest} />
          </div>

          <div className="scroll-panel flex flex-col gap-6 overflow-y-auto p-6">
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

            {lab.runsForSelectedTest.length > 0 && <RunHistoryPanel runs={lab.runsForSelectedTest} activeRunId={undefined} onSelect={() => {}} />}
          </div>
        </div>
      ) : (
        <>
          {/* Test conditions collapse to one line during playback (spec #6) */}
          <div className="border-b border-slate-800 px-4 py-2">
            {conditionsExpanded ? (
              <div className="flex flex-col gap-3 py-2">
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
                <button type="button" onClick={() => setConditionsExpanded(false)} className="self-start text-xs font-medium text-sky-400 hover:text-sky-300">
                  [Collapse]
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <p>
                  <span className="font-semibold text-slate-300">{lab.selectedTest?.label}</span>
                  {" · "}
                  {isCustomParams ? "Custom conditions" : "Scenario default conditions"}
                </p>
                <button type="button" onClick={() => setConditionsExpanded(true)} className="font-medium text-sky-400 hover:text-sky-300">
                  [Expand]
                </button>
              </div>
            )}
          </div>

          {/* Playback controls live in one consistent place (spec #17) rather than scattered across the page. */}
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                playback.status === "playing" ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-300"
              }`}
            >
              {playback.status === "playing" ? "Running" : "Paused"}
            </span>
            <TimelineControls
              frames={lab.activeResult.frames}
              playback={playback}
              speed={speed}
              onSpeedChange={setSpeed}
              onPlay={state.onPlay}
              onPause={state.onPause}
              onNext={state.onNext}
              onPrevious={state.onPrevious}
              onRestart={state.onRestart}
              onScrub={state.onScrub}
            />
          </div>

          {/* Result summary sits at the top once a run completes (spec #19/#20) - not buried below the canvas. */}
          {mode === "analyze" && (
            <div className="px-4 pt-4">
              <RunCompletionSummary passed={lab.activeResult.passed} requirements={lab.activeResult.requirementResults} bottlenecks={lab.activeResult.bottlenecks} onModify={() => setView("modify")} onRerun={lab.runTest} />
            </div>
          )}

          {/*
            React Flow requires an ancestor with a real (not min-) height to
            size itself correctly - a min-h-only wrapper inside this flex
            column let it mismeasure against the AnalysisDrawer sharing the
            same column, so its "dense" nodes rendered past their column and
            overlapped the sidebar/charts below. A fixed viewport-relative
            height plus overflow-hidden gives it a stable box and stops
            anything from spilling out of it even if a frame briefly
            mismeasures.
          */}
          <div className="grid h-[48vh] min-h-[380px] grid-cols-1 overflow-hidden lg:grid-cols-[7fr_3fr]">
            <div className="h-full overflow-hidden">
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
                dense
                nodeRuntimeMetrics={nodeRuntimeMetrics}
              />
            </div>
            {/* During an active run, the sidebar is only Live System / Requirements / Primary Bottleneck (spec #5) - no generic filler copy. */}
            <div className="scroll-panel flex h-full flex-col gap-4 overflow-y-auto border-l border-slate-800 p-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live System</h3>
                <div className="mt-2">
                  <MetricStrip metrics={currentFrame?.systemMetrics ?? {}} visibleKeys={liveMetricKeys} />
                </div>
              </div>

              {selection?.kind === "node" && currentFrame && (
                <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  {(() => {
                    const nodeState = currentFrame.nodeStates.find((n) => n.nodeId === selection.id);
                    const label = system.nodes.find((n) => n.id === selection.id)?.label ?? selection.id;
                    return (
                      <>
                        {nodeState ? <RuntimeNodeInspector label={label} state={nodeState} /> : <p className="text-xs text-slate-500">No runtime data for {label} at this point.</p>}
                        <AskAlexButton label="this component" onClick={() => askAlexAboutNode(selection.id)} />
                      </>
                    );
                  })()}
                </div>
              )}
              {selection?.kind === "edge" && currentFrame && (
                <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  {(() => {
                    const edgeState = currentFrame.edgeStates.find((e) => e.edgeId === selection.id);
                    const edge = system.edges.find((e) => e.id === selection.id);
                    const label = edge ? `${system.nodes.find((n) => n.id === edge.source)?.label ?? edge.source} -> ${system.nodes.find((n) => n.id === edge.target)?.label ?? edge.target}` : selection.id;
                    return (
                      <>
                        {edgeState ? <RuntimeEdgeInspector label={label} state={edgeState} /> : <p className="text-xs text-slate-500">No runtime data for this connection at this point.</p>}
                        <AskAlexButton label="why this dependency is synchronous" onClick={() => askAlexAboutEdge(selection.id)} />
                      </>
                    );
                  })()}
                </div>
              )}

              <RequirementsPanel
                requirements={lab.activeResult.requirementResults}
                labelsById={requirementLabelsById}
                bottlenecks={lab.activeResult.bottlenecks}
                selectedRequirementId={selectedRequirementId}
                onSelect={(requirementId, bottleneck) => {
                  setSelectedRequirementId(requirementId);
                  if (!bottleneck) return;
                  if (bottleneck.targetType === "node") selectNode(bottleneck.targetId);
                  else selectEdge(bottleneck.targetId);
                }}
              />
              {selectedRequirementId && (
                <AskAlexButton
                  label="the design assumptions behind this requirement"
                  onClick={() => askAlexAboutRequirement(selectedRequirementId, selectedRequirementBottleneck)}
                />
              )}

              {(() => {
                const primary = primaryBottleneck(lab.activeResult.bottlenecks);
                return (
                  <>
                    <BottleneckPanel
                      title="Primary Bottleneck"
                      bottlenecks={primary ? [primary] : []}
                      onSelect={(targetType, targetId) => (targetType === "node" ? selectNode(targetId) : selectEdge(targetId))}
                    />
                    {primary && <AskAlexButton label="this bottleneck" onClick={() => askAlexAboutBottleneck(primary)} />}
                  </>
                );
              })()}
            </div>
          </div>

          <AnalysisDrawer
            chartSeries={chartSeries}
            primaryChartKeys={primaryChartKeys}
            currentTimeSeconds={currentFrame?.timestampSeconds ?? 0}
            onScrub={scrubToTime}
            highlightedMetric={selectedRequirementBottleneck?.metric}
            comparison={
              lab.comparisonRun && lab.activeRun
                ? { baseline: lab.comparisonRun, current: lab.activeRun, isStrict: lab.runIsStrictComparison }
                : undefined
            }
            timelineEvents={timelineEvents}
            runs={lab.runsForSelectedTest}
            activeRunId={lab.activeRun?.id}
            onSelectRun={(run) => {
              // Selecting a historical run shows its persisted summary; frames replay only for the just-computed activeResult (spec #43).
              if (run.id === lab.activeRun?.id) return;
            }}
            defaultExpanded={mode === "analyze"}
          />
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
  onRerun,
}: {
  passed: boolean;
  requirements: Parameters<typeof countRequirementStatuses>[0];
  bottlenecks: Parameters<typeof primaryBottleneck>[0];
  onModify: () => void;
  onRerun: () => void;
}) {
  const counts = countRequirementStatuses(requirements);
  const bottleneck = primaryBottleneck(bottlenecks);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${passed ? "border-emerald-900 bg-emerald-950/20" : "border-slate-800 bg-slate-900"}`}>
      <div>
        <p className="text-sm font-semibold text-slate-100">{passed ? "SYSTEM PASSES THIS TEST" : "DESIGN NEEDS WORK"}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatRequirementScore(counts)} requirements satisfied
          {!passed && bottleneck && (
            <>
              {" · "}Primary bottleneck: <span className="text-slate-200">{bottleneck.targetId}</span> ({bottleneck.metric})
            </>
          )}
        </p>
      </div>
      {/* Re-run is the visually dominant action (spec #11) - it's the same conditions, one click, always available once a run exists. */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onRerun} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">
          Re-run Same Test
        </button>
        <button type="button" onClick={onModify} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500">
          Modify Architecture
        </button>
      </div>
    </div>
  );
}
