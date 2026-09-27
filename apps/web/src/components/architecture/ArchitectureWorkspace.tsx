import { useMemo, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import type { ArchitectureEdge, PublicArchitectureScenario, Redline } from "@purgatory/shared";
import { useSelection } from "../../features/architecture-review/useSelection.js";
import { useReviewState } from "../../features/architecture-review/reviewStateStore.js";
import { isReviewLocked, redlinesForTarget, type RedlineDraft } from "../../features/architecture-review/reviewState.js";
import { ScenarioHeader } from "./ScenarioHeader.js";
import { RequirementsPanel } from "./RequirementsPanel.js";
import { ArchitectureCanvas } from "./ArchitectureCanvas.js";
import { ArchitectPanel } from "./ArchitectPanel.js";
import { ComponentInspector } from "./ComponentInspector.js";
import { ConnectionInspector } from "./ConnectionInspector.js";
import { ReviewFooter } from "./ReviewFooter.js";
import { ReviewInstructions } from "../review/ReviewInstructions.js";
import { MarkReviewedControl } from "../review/MarkReviewedControl.js";
import { RedlineComposer } from "../review/RedlineComposer.js";
import { RedlineList } from "../review/RedlineList.js";
import { ReviewerNotes } from "../review/ReviewerNotes.js";

type RightTab = "inspector" | "redlines" | "notes";
type ComposerState = { targetType: "node" | "edge"; targetId: string; redlineId?: string } | null;

export function ArchitectureWorkspace({ scenario }: { scenario: PublicArchitectureScenario }) {
  const { selection, selectNode, selectEdge, clearSelection } = useSelection();
  const { state, dispatch } = useReviewState();
  const locked = isReviewLocked(state);
  const [introOpen, setIntroOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("inspector");
  const [composer, setComposer] = useState<ComposerState>(null);

  const selectedNode = selection?.kind === "node" ? scenario.nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === "edge" ? scenario.edges.find((e) => e.id === selection.id) : undefined;

  const nodeLabel = (id: string) => scenario.nodes.find((n) => n.id === id)?.label ?? id;
  const edgeLabel = (edge: ArchitectureEdge) => `${nodeLabel(edge.source)} → ${nodeLabel(edge.target)}`;
  const targetDisplayLabel = (targetType: "node" | "edge", targetId: string) => {
    if (targetType === "node") return nodeLabel(targetId);
    const edge = scenario.edges.find((e) => e.id === targetId);
    return edge ? edgeLabel(edge) : targetId;
  };

  const redlineCountByNodeId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const redline of state.redlines) {
      if (redline.targetType === "node") counts[redline.targetId] = (counts[redline.targetId] ?? 0) + 1;
    }
    return counts;
  }, [state.redlines]);

  const redlineCountByEdgeId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const redline of state.redlines) {
      if (redline.targetType === "edge") counts[redline.targetId] = (counts[redline.targetId] ?? 0) + 1;
    }
    return counts;
  }, [state.redlines]);

  function openComposerForSelection() {
    if (locked) return;
    if (selection) setComposer({ targetType: selection.kind, targetId: selection.id });
  }

  function openComposerForEdit(redline: Redline) {
    if (locked) return;
    if (redline.targetType === "node") selectNode(redline.targetId);
    else selectEdge(redline.targetId);
    setComposer({ targetType: redline.targetType, targetId: redline.targetId, redlineId: redline.id });
    setRightTab("inspector");
  }

  function handleSelectRedlineTarget(redline: Redline) {
    if (redline.targetType === "node") selectNode(redline.targetId);
    else selectEdge(redline.targetId);
    setRightTab("inspector");
  }

  function handleDeleteRedline(redline: Redline) {
    dispatch({ type: "DELETE_REDLINE", id: redline.id });
  }

  function handleComposerSave(draft: RedlineDraft) {
    if (composer?.redlineId) {
      dispatch({ type: "UPDATE_REDLINE", id: composer.redlineId, draft });
    } else {
      dispatch({
        type: "ADD_REDLINE",
        redline: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...draft },
      });
    }
    setComposer(null);
  }

  const editingRedline = composer?.redlineId ? state.redlines.find((r) => r.id === composer.redlineId) : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {introOpen && (
        <ReviewInstructions scenario={scenario} dismissLabel="Begin Review" onDismiss={() => setIntroOpen(false)} />
      )}
      {guideOpen && <ReviewInstructions scenario={scenario} dismissLabel="Close" onDismiss={() => setGuideOpen(false)} />}

      <ScenarioHeader scenario={scenario} />
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr_340px]">
        <RequirementsPanel scenario={scenario} />

        <div className="min-h-0">
          <ArchitectureCanvas
            nodes={scenario.nodes}
            edges={scenario.edges}
            selection={selection}
            onSelectNode={(id) => {
              selectNode(id);
              setComposer(null);
              setRightTab("inspector");
            }}
            onSelectEdge={(id) => {
              selectEdge(id);
              setComposer(null);
              setRightTab("inspector");
            }}
            onClearSelection={clearSelection}
            reviewedNodeIds={new Set(state.reviewedNodeIds)}
            reviewedEdgeIds={new Set(state.reviewedEdgeIds)}
            redlineCountByNodeId={redlineCountByNodeId}
            redlineCountByEdgeId={redlineCountByEdgeId}
          />
        </div>

        <div className="flex h-full flex-col overflow-hidden border-l border-slate-800">
          <ConversationProvider>
            <ArchitectPanel scenario={scenario} locked={locked} />
          </ConversationProvider>

          <div role="tablist" aria-label="Review panel" className="flex border-b border-slate-800">
            {(
              [
                ["inspector", "Inspector"],
                ["redlines", `Redlines${state.redlines.length > 0 ? ` (${state.redlines.length})` : ""}`],
                ["notes", "Notes"],
              ] as const
            ).map(([key, tabLabel]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={rightTab === key}
                onClick={() => {
                  setComposer(null);
                  setRightTab(key);
                }}
                className={`flex-1 px-2 py-2 text-xs font-medium ${
                  rightTab === key ? "border-b-2 border-sky-500 text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tabLabel}
              </button>
            ))}
          </div>

          <div className="scroll-panel min-h-0 flex-1 overflow-y-auto bg-slate-900 p-4">
            {composer && !locked ? (
              <RedlineComposer
                targetType={composer.targetType}
                targetId={composer.targetId}
                targetLabel={targetDisplayLabel(composer.targetType, composer.targetId)}
                initial={editingRedline}
                onSave={handleComposerSave}
                onCancel={() => setComposer(null)}
              />
            ) : rightTab === "inspector" ? (
              <div className="flex flex-col gap-4">
                {selectedNode && (
                  <>
                    <ComponentInspector
                      node={selectedNode}
                      details={scenario.componentDetails.find((d) => d.nodeId === selectedNode.id)}
                    />
                    <InspectorReviewActions
                      reviewed={state.reviewedNodeIds.includes(selectedNode.id)}
                      locked={locked}
                      onMarkReviewed={() => dispatch({ type: "MARK_NODE_REVIEWED", nodeId: selectedNode.id })}
                      onAddRedline={openComposerForSelection}
                    />
                    <RedlineList
                      redlines={redlinesForTarget(state, "node", selectedNode.id)}
                      targetLabel={(r) => targetDisplayLabel(r.targetType, r.targetId)}
                      onSelectTarget={handleSelectRedlineTarget}
                      onEdit={openComposerForEdit}
                      onDelete={handleDeleteRedline}
                      readOnly={locked}
                    />
                  </>
                )}
                {selectedEdge && (
                  <>
                    <ConnectionInspector
                      edge={selectedEdge}
                      sourceNode={scenario.nodes.find((n) => n.id === selectedEdge.source)}
                      targetNode={scenario.nodes.find((n) => n.id === selectedEdge.target)}
                      details={scenario.connectionDetails.find((d) => d.edgeId === selectedEdge.id)}
                    />
                    <InspectorReviewActions
                      reviewed={state.reviewedEdgeIds.includes(selectedEdge.id)}
                      locked={locked}
                      onMarkReviewed={() => dispatch({ type: "MARK_EDGE_REVIEWED", edgeId: selectedEdge.id })}
                      onAddRedline={openComposerForSelection}
                    />
                    <RedlineList
                      redlines={redlinesForTarget(state, "edge", selectedEdge.id)}
                      targetLabel={(r) => targetDisplayLabel(r.targetType, r.targetId)}
                      onSelectTarget={handleSelectRedlineTarget}
                      onEdit={openComposerForEdit}
                      onDelete={handleDeleteRedline}
                      readOnly={locked}
                    />
                  </>
                )}
                {!selectedNode && !selectedEdge && (
                  <p className="text-xs text-slate-500">Select a component or connection to inspect it.</p>
                )}
              </div>
            ) : rightTab === "redlines" ? (
              <RedlineList
                redlines={state.redlines}
                targetLabel={(r) => targetDisplayLabel(r.targetType, r.targetId)}
                onSelectTarget={handleSelectRedlineTarget}
                onEdit={openComposerForEdit}
                onDelete={handleDeleteRedline}
                readOnly={locked}
              />
            ) : (
              <ReviewerNotes
                notes={state.reviewerNotes}
                onChange={(notes) => dispatch({ type: "SET_NOTES", notes })}
                disabled={locked}
              />
            )}
          </div>
        </div>
      </div>
      <ReviewFooter
        scenario={scenario}
        reviewedNodeCount={state.reviewedNodeIds.length}
        reviewedEdgeCount={state.reviewedEdgeIds.length}
        redlineCount={state.redlines.length}
        locked={locked}
        onOpenGuide={() => setGuideOpen(true)}
      />
    </div>
  );
}

function InspectorReviewActions({
  reviewed,
  locked,
  onMarkReviewed,
  onAddRedline,
}: {
  reviewed: boolean;
  locked: boolean;
  onMarkReviewed: () => void;
  onAddRedline: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
      <MarkReviewedControl reviewed={reviewed} locked={locked} onMarkReviewed={onMarkReviewed} />
      {!locked && (
        <button
          type="button"
          onClick={onAddRedline}
          className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500"
        >
          Add Redline
        </button>
      )}
    </div>
  );
}
