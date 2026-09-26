import { useEffect, useState } from "react";

const STAGES = ["Preparing repository…", "Inspecting project…", "Running readiness checks…", "Building report…"];
const STAGE_INTERVAL_MS = 1800;

export function ScanLoadingState() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-slate-900" />
      </div>
      <p className="text-slate-700">{STAGES[stageIndex]}</p>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
