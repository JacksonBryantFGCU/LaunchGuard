import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ArchitectureNodeCategory, NodeEffectState } from "@redline/shared";
import { NODE_CATEGORY_LABELS } from "../../features/scenarios/labels.js";

const CATEGORY_BORDER: Record<ArchitectureNodeCategory, string> = {
  client: "border-slate-600",
  gateway: "border-sky-700",
  "load-balancer": "border-sky-700",
  service: "border-emerald-700",
  database: "border-amber-700",
  cache: "border-amber-700",
  queue: "border-violet-700",
  worker: "border-violet-700",
  external: "border-rose-700",
  observability: "border-slate-600",
};

// Text label alongside color so stress state is never color-only.
const STRESS_STATE_LABEL: Record<NodeEffectState, string> = {
  normal: "Normal",
  degraded: "Degraded",
  saturated: "Saturated",
  unavailable: "Unavailable",
  recovering: "Recovering",
};

const STRESS_STATE_RING: Partial<Record<NodeEffectState, string>> = {
  degraded: "ring-2 ring-amber-500",
  saturated: "ring-2 ring-orange-500",
  unavailable: "ring-2 ring-red-500",
  recovering: "ring-2 ring-sky-400",
};

type ArchitectureNodeData = {
  label: string;
  category: ArchitectureNodeCategory;
  summary: string;
  reviewed: boolean;
  redlineCount: number;
  stressState?: NodeEffectState | null;
};

type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

export function ArchitectureNodeView({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const stressRing = data.stressState ? STRESS_STATE_RING[data.stressState] : undefined;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`w-48 rounded-md border bg-slate-900 px-3 py-2 text-left shadow-sm transition-shadow ${CATEGORY_BORDER[data.category]} ${
        selected ? "ring-2 ring-sky-400" : (stressRing ?? "")
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-600" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-slate-600" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {NODE_CATEGORY_LABELS[data.category]}
        </p>
        {data.redlineCount > 0 && (
          <span
            title={`${data.redlineCount} redline${data.redlineCount === 1 ? "" : "s"}`}
            className="rounded-full bg-amber-950 px-1.5 text-[10px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-800"
          >
            {data.redlineCount}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm font-medium text-slate-100">{data.label}</p>
      <p className="mt-0.5 truncate text-xs text-slate-400">{data.summary}</p>
      {data.reviewed && <p className="mt-1 text-[10px] font-medium text-emerald-400">✓ Reviewed</p>}
      {data.stressState && data.stressState !== "normal" && (
        <p className="mt-1 text-[10px] font-semibold text-amber-400">{STRESS_STATE_LABEL[data.stressState]}</p>
      )}
    </div>
  );
}
