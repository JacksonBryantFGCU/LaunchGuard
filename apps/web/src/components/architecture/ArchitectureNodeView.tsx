import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ArchitectureNodeCategory, NodeEffectState } from "@purgatory/shared";
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
  // Stress Lab "dense" runtime display (spec #4): larger node, bigger type,
  // and up to a handful of the metrics that are actually meaningful for this
  // node's type (never a uniform set across every node - a node with no
  // metrics this frame just shows none).
  dense?: boolean;
  runtimeMetrics?: Record<string, string>;
};

type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

const MAX_DENSE_METRICS = 4;

export function ArchitectureNodeView({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const stressRing = data.stressState ? STRESS_STATE_RING[data.stressState] : undefined;
  const dense = data.dense ?? false;
  const metricEntries = dense && data.runtimeMetrics ? Object.entries(data.runtimeMetrics).slice(0, MAX_DENSE_METRICS) : [];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`rounded-md border bg-slate-900 text-left shadow-sm transition-shadow ${dense ? "w-80 px-5 py-4" : "w-48 px-3 py-2"} ${CATEGORY_BORDER[data.category]} ${
        selected ? "ring-2 ring-sky-400" : (stressRing ?? "")
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-600" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-slate-600" />
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold uppercase tracking-wide text-slate-500 ${dense ? "text-xs" : "text-[10px]"}`}>
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
      <p className={`mt-0.5 font-medium text-slate-100 ${dense ? "text-lg" : "text-sm"}`}>{data.label}</p>
      {!dense && <p className="mt-0.5 truncate text-xs text-slate-400">{data.summary}</p>}
      {data.reviewed && <p className="mt-1 text-[10px] font-medium text-emerald-400">✓ Reviewed</p>}
      {data.stressState && data.stressState !== "normal" && (
        <p className={`mt-1 font-semibold text-amber-400 ${dense ? "text-sm" : "text-[10px]"}`}>{STRESS_STATE_LABEL[data.stressState]}</p>
      )}
      {metricEntries.length > 0 && (
        <dl className={`mt-2 grid grid-cols-2 gap-x-3 border-t border-slate-800 ${dense ? "gap-y-2 pt-3" : "gap-y-1 pt-2"}`}>
          {metricEntries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className={`truncate uppercase tracking-wide text-slate-500 ${dense ? "text-xs" : "text-[10px]"}`}>{key}</dt>
              <dd className={`truncate font-mono text-slate-200 ${dense ? "text-sm" : "text-xs"}`}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
