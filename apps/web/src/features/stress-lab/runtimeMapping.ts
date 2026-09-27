import type { EdgeEffectState, NodeEffectState, SimulationFrame } from "@redline/shared";

/** Base architecture node/edge ids are the source of truth for the overlay's keys - a frame missing a state for one falls back to null (spec #73), never dropping the node/edge from the graph. */
export function mapFrameToNodeStates(frame: SimulationFrame, baseNodeIds: string[]): Record<string, NodeEffectState | null> {
  const byId = new Map(frame.nodeStates.map((n) => [n.nodeId, n.state]));
  return Object.fromEntries(baseNodeIds.map((id) => [id, byId.get(id) ?? null]));
}

export function mapFrameToEdgeStates(frame: SimulationFrame, baseEdgeIds: string[]): Record<string, EdgeEffectState | null> {
  const byId = new Map(frame.edgeStates.map((e) => [e.edgeId, e.state]));
  return Object.fromEntries(baseEdgeIds.map((id) => [id, byId.get(id) ?? null]));
}
