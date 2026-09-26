import { useState } from "react";

export type ArchitectureSelection = { kind: "node"; id: string } | { kind: "edge"; id: string } | null;

export function useSelection() {
  const [selection, setSelection] = useState<ArchitectureSelection>(null);

  return {
    selection,
    selectNode: (id: string) => setSelection({ kind: "node", id }),
    selectEdge: (id: string) => setSelection({ kind: "edge", id }),
    clearSelection: () => setSelection(null),
  };
}
