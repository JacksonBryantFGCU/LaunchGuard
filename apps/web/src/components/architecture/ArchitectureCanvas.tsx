import { useMemo } from "react";
import { ReactFlow, Background, Controls, MarkerType, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ArchitectureEdge, ArchitectureNode, EdgeEffectState, NodeEffectState } from "@redline/shared";
import { ArchitectureNodeView } from "./ArchitectureNodeView.js";
import type { ArchitectureSelection } from "../../features/architecture-review/useSelection.js";

const nodeTypes = { architecture: ArchitectureNodeView };

// Stress-overlay color treatment, restrained to the four non-normal states
// (Phase 5). "normal"/undefined never override the ordinary review styling.
const NODE_STRESS_BORDER_COLOR: Partial<Record<NodeEffectState, string>> = {
  degraded: "#f59e0b",
  saturated: "#f97316",
  unavailable: "#ef4444",
  recovering: "#38bdf8",
};

const EDGE_STRESS_STROKE_COLOR: Partial<Record<EdgeEffectState, string>> = {
  degraded: "#f59e0b",
  backlogged: "#f97316",
  timed_out: "#ef4444",
  unavailable: "#ef4444",
};

interface ArchitectureCanvasProps {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selection: ArchitectureSelection;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onClearSelection: () => void;
  reviewedNodeIds: Set<string>;
  reviewedEdgeIds: Set<string>;
  redlineCountByNodeId: Record<string, number>;
  redlineCountByEdgeId: Record<string, number>;
  // Phase 5 stress-test overlay: derived from the current step, never
  // persisted onto the underlying scenario nodes/edges. Absent outside the
  // simulator, so the ordinary review canvas is unaffected.
  nodeStressStates?: Record<string, NodeEffectState | null>;
  edgeStressStates?: Record<string, EdgeEffectState | null>;
}

export function ArchitectureCanvas({
  nodes,
  edges,
  selection,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  reviewedNodeIds,
  reviewedEdgeIds,
  redlineCountByNodeId,
  redlineCountByEdgeId,
  nodeStressStates,
  edgeStressStates,
}: ArchitectureCanvasProps) {
  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((node) => {
        const stressState = nodeStressStates?.[node.id] ?? null;
        const stressBorderColor = stressState ? NODE_STRESS_BORDER_COLOR[stressState] : undefined;
        return {
          id: node.id,
          type: "architecture",
          position: node.position,
          data: {
            label: node.label,
            category: node.category,
            summary: node.summary,
            reviewed: reviewedNodeIds.has(node.id),
            redlineCount: redlineCountByNodeId[node.id] ?? 0,
            stressState,
          },
          selected: selection?.kind === "node" && selection.id === node.id,
          draggable: false,
          connectable: false,
          deletable: false,
          ...(stressBorderColor
            ? { className: stressState === "saturated" || stressState === "unavailable" ? "animate-pulse" : undefined }
            : {}),
        };
      }),
    [nodes, selection, reviewedNodeIds, redlineCountByNodeId, nodeStressStates],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((edge) => {
        const isSelected = selection?.kind === "edge" && selection.id === edge.id;
        const redlineCount = redlineCountByEdgeId[edge.id] ?? 0;
        const isReviewed = reviewedEdgeIds.has(edge.id);
        const stressState = edgeStressStates?.[edge.id] ?? null;
        const stressColor = stressState ? EDGE_STRESS_STROKE_COLOR[stressState] : undefined;
        const stressSuffix = stressState && stressState !== "normal" ? ` [${stressState.replace("_", " ")}]` : "";
        const label = [isReviewed ? "✓" : null, edge.label, redlineCount > 0 ? `(${redlineCount})` : null]
          .filter(Boolean)
          .join(" ") + stressSuffix;
        const strokeColor = isSelected ? "#38bdf8" : (stressColor ?? (redlineCount > 0 ? "#f59e0b" : "#64748b"));
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label,
          type: "smoothstep",
          animated: edge.mode === "asynchronous" || Boolean(stressColor),
          selected: isSelected,
          deletable: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
          style: { stroke: strokeColor, strokeWidth: isSelected || stressColor ? 2 : 1.5 },
          labelStyle: { fill: "#cbd5e1", fontSize: 11 },
          labelBgStyle: { fill: "#0f172a" },
        };
      }),
    [edges, selection, reviewedEdgeIds, redlineCountByEdgeId, edgeStressStates],
  );

  return (
    <div className="h-full w-full bg-slate-950">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        onNodeClick={(_event, node) => onSelectNode(node.id)}
        onEdgeClick={(_event, edge) => onSelectEdge(edge.id)}
        onPaneClick={onClearSelection}
        colorMode="dark"
      >
        <Background gap={16} color="#1e293b" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
