import { useEffect, useState } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from "@xyflow/react";
import type { EdgeEffectState } from "@redline/shared";

// Animated request-flow overlay (spec #48/#49): a small packet dot travels
// the edge path via SVG <animateMotion>, with speed/opacity mapping to edge
// state - not an exact packet-rate simulation, just a qualitative "how much
// is flowing and how well" cue. Text/color already carry the state
// elsewhere (edge label, stroke color); this is presentation only.
const FLOW_BY_STATE: Partial<Record<EdgeEffectState, { durationSeconds: number; opacity: number }>> = {
  normal: { durationSeconds: 2.5, opacity: 0.55 },
  degraded: { durationSeconds: 1.6, opacity: 0.75 },
  backlogged: { durationSeconds: 0.9, opacity: 1 },
  // timed_out/unavailable are deliberately absent: no continuous flow renders for a failed/interrupted edge.
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export type StressRuntimeEdgeData = { stressState?: EdgeEffectState | null };
type StressRuntimeEdgeType = Edge<StressRuntimeEdgeData, "stress-edge">;

export function StressRuntimeEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: EdgeProps<StressRuntimeEdgeType>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const reducedMotion = usePrefersReducedMotion();
  const flow = data?.stressState ? FLOW_BY_STATE[data.stressState] : FLOW_BY_STATE.normal;

  return (
    <>
      <BaseEdge path={path} style={style} markerEnd={markerEnd} />
      {flow && !reducedMotion && (
        <circle r={3} fill={(style?.stroke as string) ?? "#64748b"} opacity={flow.opacity}>
          <animateMotion dur={`${flow.durationSeconds}s`} repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  );
}
