import { useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ConversationProvider } from "@elevenlabs/react";
import type {
  ScenarioSeverity,
  ScenarioConfidence,
  PracticeResponseDraft,
  ArchitectureNode,
  ArchitectureEdge,
} from "@redline/shared";
import { usePracticeAttempt } from "../features/practice-scenarios/practiceAttemptStore.js";
import { resolveResourceTab, isResponseLocked, type ResourceTab } from "../features/practice-scenarios/practiceWorkflow.js";
import { useSelection } from "../features/architecture-review/useSelection.js";
import { useReviewState } from "../features/architecture-review/reviewStateStore.js";
import { ArchitectureCanvas } from "../components/architecture/ArchitectureCanvas.js";
import { ComponentInspector } from "../components/architecture/ComponentInspector.js";
import { ConnectionInspector } from "../components/architecture/ConnectionInspector.js";
import { ArchitectPanel } from "../components/architecture/ArchitectPanel.js";
import { ApiError } from "../lib/api/client.js";
import type { PracticeScenarioOutletContext } from "./PracticeScenarioLayout.js";
import { useStressLabTabState } from "../features/stress-lab/useStressLabTabState.js";
import { StressLabTab as StressLabTabView, type ArchitectFocusRequest } from "../features/stress-lab/StressLabTab.js";
import { suggestedQuestionsForFocus } from "../features/voice/architectContext.js";

const TAB_LABELS: Record<ResourceTab, string> = {
  overview: "Overview",
  metrics: "Metrics & Evidence",
  requirements: "Requirements",
  architecture: "Architecture",
  "stress-lab": "Stress Lab",
  architect: "Ask Architect",
  response: "Your Response",
};

const SEVERITIES: ScenarioSeverity[] = ["low", "medium", "high", "critical"];
const CONFIDENCES: ScenarioConfidence[] = ["low", "medium", "high"];

export function PracticeInvestigationPage() {
  const { system, practiceScenario, reviewSessionId } = useOutletContext<PracticeScenarioOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveResourceTab(searchParams.get("tab"));

  // Lifted to the page level (not the "stress-lab" tab's own render) so
  // switching to Architecture/Requirements/Ask Architect/Your Response and
  // back never loses the selected test, parameters, design modifications,
  // or completed runs (spec #17) - the tab is just conditionally rendered,
  // not unmounted.
  const stressLabState = useStressLabTabState(reviewSessionId, practiceScenario.id);
  const [architectFocus, setArchitectFocus] = useState<ArchitectFocusRequest | undefined>(undefined);

  function setTab(next: ResourceTab) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", next);
      return params;
    });
  }

  function askArchitect(focus: ArchitectFocusRequest) {
    setArchitectFocus(focus);
    setTab("architect");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="border-b border-slate-800 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scenario {practiceScenario.order} of 5 · {practiceScenario.title}
        </p>
        <p className="mt-1 text-xs text-slate-500">{practiceScenario.objective}</p>
      </header>

      <div role="tablist" aria-label="Investigation resources" className="flex overflow-x-auto border-b border-slate-800">
        {(Object.keys(TAB_LABELS) as ResourceTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-3 py-2 text-xs font-medium ${
              tab === key ? "border-b-2 border-sky-500 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && <OverviewTab />}
        {tab === "metrics" && <MetricsTab system={system} />}
        {tab === "requirements" && <RequirementsTab system={system} />}
        {tab === "architecture" && <ArchitectureTab system={system} />}
        {tab === "stress-lab" && (
          <div className="h-full">
            <StressLabTabView system={system} practiceScenario={practiceScenario} state={stressLabState} onAskArchitect={askArchitect} />
          </div>
        )}
        {tab === "architect" && <ArchitectTab system={system} focus={architectFocus} onClearFocus={() => setArchitectFocus(undefined)} />}
        {tab === "response" && <ResponseTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { system, practiceScenario } = useOutletContext<PracticeScenarioOutletContext>();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situation</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{practiceScenario.situation}</p>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Objective</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{practiceScenario.objective}</p>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Where to start</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
        {practiceScenario.investigationPrompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-slate-500">System: {system.title.replace(" Redesign", "")}</p>
    </div>
  );
}

function EvidenceSaveButton({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onSave();
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }}
      className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 hover:border-slate-500"
    >
      {saved ? "Saved" : "Save as Evidence"}
    </button>
  );
}

function MetricsTab({ system }: { system: PracticeScenarioOutletContext["system"] }) {
  const { addEvidence } = usePracticeAttempt();
  const grouped = system.evidence.reduce<Record<string, typeof system.evidence>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Observations</h2>
      <p className="mt-1 text-xs text-slate-500">Authored scenario evidence - not live telemetry.</p>

      <div className="mt-4 flex flex-col gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</p>
            <dl className="mt-2 flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 p-2.5">
                  <div>
                    <dt className="text-xs text-slate-400">{item.label}</dt>
                    <dd className="text-sm font-medium text-slate-100">{item.value}</dd>
                  </div>
                  <EvidenceSaveButton
                    onSave={() =>
                      addEvidence({
                        sourceType: "scenario_evidence",
                        sourceId: item.id,
                        label: item.label,
                        content: item.value,
                      })
                    }
                  />
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequirementsTab({ system }: { system: PracticeScenarioOutletContext["system"] }) {
  const { addEvidence } = usePracticeAttempt();
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Requirements</h2>
      <p className="mt-1 text-xs text-slate-500">Select which of these are affected from Your Response.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {system.requirements.map((req) => (
          <li key={req.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 p-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{req.area}</p>
              <p className="mt-0.5 text-sm text-slate-200">{req.summary}</p>
              {req.target && <p className="mt-1 text-xs font-medium text-sky-400">{req.target}</p>}
            </div>
            <EvidenceSaveButton
              onSave={() => addEvidence({ sourceType: "requirement", sourceId: req.id, label: req.summary, content: req.target ?? req.summary })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArchitectureTab({ system }: { system: PracticeScenarioOutletContext["system"] }) {
  const { addEvidence } = usePracticeAttempt();
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();
  const selectedNode: ArchitectureNode | undefined = selection?.kind === "node" ? system.nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge: ArchitectureEdge | undefined = selection?.kind === "edge" ? system.edges.find((e) => e.id === selection.id) : undefined;
  const nodeLabel = (id: string) => system.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[1fr_320px]">
      <div className="min-h-[400px]">
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
        />
      </div>
      <div className="border-l border-slate-800 bg-slate-900 p-4">
        <p className="text-xs text-slate-500">
          Use the architecture to understand dependencies, data flow, capacity boundaries, and failure propagation.
        </p>
        <div className="mt-4">
          {selectedNode && (
            <>
              <ComponentInspector node={selectedNode} details={system.componentDetails.find((d) => d.nodeId === selectedNode.id)} />
              <div className="mt-3">
                <EvidenceSaveButton
                  onSave={() =>
                    addEvidence({ sourceType: "architecture_node", sourceId: selectedNode.id, label: selectedNode.label, content: selectedNode.summary })
                  }
                />
              </div>
            </>
          )}
          {selectedEdge && (
            <>
              <ConnectionInspector
                edge={selectedEdge}
                sourceNode={system.nodes.find((n) => n.id === selectedEdge.source)}
                targetNode={system.nodes.find((n) => n.id === selectedEdge.target)}
                details={system.connectionDetails.find((d) => d.edgeId === selectedEdge.id)}
              />
              <div className="mt-3">
                <EvidenceSaveButton
                  onSave={() =>
                    addEvidence({
                      sourceType: "architecture_edge",
                      sourceId: selectedEdge.id,
                      label: `${nodeLabel(selectedEdge.source)} -> ${nodeLabel(selectedEdge.target)}`,
                      content: selectedEdge.label,
                    })
                  }
                />
              </div>
            </>
          )}
          {!selectedNode && !selectedEdge && <p className="text-xs text-slate-500">Select a component or connection to inspect it.</p>}
        </div>
      </div>
    </div>
  );
}

function ArchitectTab({
  system,
  focus,
  onClearFocus,
}: {
  system: PracticeScenarioOutletContext["system"];
  focus?: ArchitectFocusRequest;
  onClearFocus: () => void;
}) {
  const { practiceScenario } = useOutletContext<PracticeScenarioOutletContext>();
  const { addEvidence } = usePracticeAttempt();

  // Contextual entry point (spec #13/#15): a "this bottleneck"/"this
  // component" focus carried over from Stress Lab replaces the generic
  // investigation prompts with questions about that specific selection.
  // Voice stays a tab (not a drawer) because the ElevenLabs conversation
  // must fully unmount/remount through ConversationProvider - a drawer would
  // require a second, always-mounted provider instance for no real benefit
  // over carrying context here and letting the learner return to Stress Lab.
  const suggestedQuestions = focus?.bottleneck ? suggestedQuestionsForFocus(focus.bottleneck) : practiceScenario.investigationPrompts;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ask the Architect</h2>
      <p className="mt-1 text-sm text-slate-400">
        {system.architect.name} designed this system. Ask about assumptions, dependencies, scaling behavior, failure
        handling, or tradeoffs that aren't obvious from the available system information.
      </p>
      <p className="mt-2 text-xs text-slate-500">Voice is entirely optional - you can complete this scenario without ever starting a conversation.</p>

      {focus && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-sky-800 bg-sky-950/30 px-3 py-2 text-xs text-sky-300">
          <span>Focused on: {focus.focusLabel}</span>
          <button type="button" onClick={onClearFocus} className="font-medium underline">
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested questions</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
          {suggestedQuestions.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <ConversationProvider>
          <ArchitectPanelWithEvidence system={system} onSaveLastTurn={addEvidence} focus={focus} />
        </ConversationProvider>
      </div>
    </div>
  );
}

function ArchitectPanelWithEvidence({
  system,
  onSaveLastTurn,
  focus,
}: {
  system: PracticeScenarioOutletContext["system"];
  onSaveLastTurn: ReturnType<typeof usePracticeAttempt>["addEvidence"];
  focus?: ArchitectFocusRequest;
}) {
  const { view } = usePracticeAttempt();
  return (
    <div className="flex flex-col gap-3">
      <ArchitectPanel scenario={system} locked={false} focus={focus?.context} focusLabel={focus?.focusLabel} />
      <SaveLastArchitectTurn system={system} onSave={onSaveLastTurn} locked={isResponseLocked(view.status)} />
    </div>
  );
}

function SaveLastArchitectTurn({
  system,
  onSave,
  locked,
}: {
  system: PracticeScenarioOutletContext["system"];
  onSave: ReturnType<typeof usePracticeAttempt>["addEvidence"];
  locked: boolean;
}) {
  // Reads the same transcript the ArchitectPanel above renders, via the
  // shared review-state context, so "Save as Evidence" always refers to
  // whatever the learner last heard - never auto-saves every turn.
  const { state } = useReviewState();
  const lastArchitectTurn = [...state.transcript].reverse().find((t) => t.speaker === "architect");
  if (!lastArchitectTurn || locked) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 p-3">
      <p className="min-w-0 flex-1 truncate text-xs text-slate-400">Last: "{lastArchitectTurn.text}"</p>
      <EvidenceSaveButton
        onSave={() =>
          onSave({
            sourceType: "architect_statement",
            sourceId: null,
            label: `${system.architect.name} on this situation`,
            content: lastArchitectTurn.text,
            transcriptTurnId: lastArchitectTurn.id,
          })
        }
      />
    </div>
  );
}

function ResponseTab() {
  const { system, practiceScenario } = useOutletContext<PracticeScenarioOutletContext>();
  const { view, autosaveStatus, updateDraft, setRequirements, setSelectedEvidence, submit } = usePracticeAttempt();
  const [reviewing, setReviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const locked = isResponseLocked(view.status);

  function field(key: keyof PracticeResponseDraft, label: string, helper: string) {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={key} className="text-sm font-medium text-slate-200">
          {label}
        </label>
        <p className="text-xs text-slate-500">{helper}</p>
        <textarea
          id={key}
          value={String(view.response[key] ?? "")}
          onChange={(e) => updateDraft({ [key]: e.target.value })}
          disabled={locked}
          rows={3}
          className="mt-1 rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 disabled:opacity-60"
        />
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submit();
      navigate(`/app/practice/${system.slug}/${practiceScenario.id}/result`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't submit your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-xl font-semibold text-slate-100">Make Your Call</h2>
      <p className="mt-1 text-sm text-slate-400">Based on what you investigated, explain how you would respond.</p>
      {!locked && (
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          {autosaveStatus === "saving" && "Saving…"}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "error" && "Save failed - your input is preserved, retrying on your next edit."}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {field("diagnosis", "What do you think is happening?", "Describe the system behavior or failure mode you believe explains the situation.")}
        {field("investigationPlan", "What would you investigate first?", "Explain what you would verify before or while making changes.")}
        {field("immediateAction", "What would you do immediately?", "Describe the short-term mitigation or operational response.")}
        {field("architectureDecision", "What would you change long term?", "Describe the architecture change you would make to reduce future risk.")}
        {field("tradeoff", "What tradeoff does your approach introduce?", "Consider complexity, cost, consistency, latency, availability, or operational burden.")}

        <div>
          <p className="text-sm font-medium text-slate-200">Severity</p>
          <div className="mt-1 flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={locked}
                onClick={() => updateDraft({ severity: s })}
                aria-pressed={view.response.severity === s}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize disabled:opacity-60 ${
                  view.response.severity === s ? "border-sky-500 bg-sky-950 text-sky-300" : "border-slate-700 text-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-200">Confidence</p>
          <div className="mt-1 flex gap-2">
            {CONFIDENCES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={() => updateDraft({ confidence: c })}
                aria-pressed={view.response.confidence === c}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize disabled:opacity-60 ${
                  view.response.confidence === c ? "border-sky-500 bg-sky-950 text-sky-300" : "border-slate-700 text-slate-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-200">Which requirements are affected?</p>
          <div className="mt-2 flex flex-col gap-2">
            {system.requirements.map((req) => {
              const checked = view.affectedRequirementIds.includes(req.id);
              return (
                <label key={req.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => {
                      const next = checked
                        ? view.affectedRequirementIds.filter((id) => id !== req.id)
                        : [...view.affectedRequirementIds, req.id];
                      setRequirements(next).catch((err: unknown) => console.error("Failed to save requirements", err));
                    }}
                  />
                  {req.summary} {req.target && <span className="text-xs text-slate-500">({req.target})</span>}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-200">Evidence used</p>
          {view.evidence.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Save evidence from Metrics, Requirements, Architecture, or Ask Architect first.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {view.evidence.map((item) => {
                const checked = view.selectedEvidenceIds.includes(item.id);
                return (
                  <label key={item.id} className="flex items-start gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => {
                        const next = checked
                          ? view.selectedEvidenceIds.filter((id) => id !== item.id)
                          : [...view.selectedEvidenceIds, item.id];
                        setSelectedEvidence(next).catch((err: unknown) => console.error("Failed to save evidence selection", err));
                      }}
                    />
                    <span>
                      {item.label}: <span className="text-slate-400">{item.content}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {locked ? (
        <p className="mt-8 text-sm text-slate-400">This response has been submitted and can no longer be changed.</p>
      ) : reviewing ? (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Review Your Response</h3>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <SummaryRow label="Diagnosis" value={view.response.diagnosis} />
            <SummaryRow label="Investigation plan" value={view.response.investigationPlan} />
            <SummaryRow label="Immediate action" value={view.response.immediateAction} />
            <SummaryRow label="Architecture decision" value={view.response.architectureDecision} />
            <SummaryRow label="Tradeoff" value={view.response.tradeoff} />
            <SummaryRow label="Severity" value={view.response.severity ?? "-"} />
            <SummaryRow label="Affected requirements" value={String(view.affectedRequirementIds.length)} />
            <SummaryRow label="Evidence used" value={String(view.selectedEvidenceIds.length)} />
          </dl>
          {submitError && <p className="mt-3 text-xs text-red-400">{submitError}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Scenario Response"}
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300"
            >
              Keep Editing
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="mt-8 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Review Your Response
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value || "-"}</dd>
    </div>
  );
}
