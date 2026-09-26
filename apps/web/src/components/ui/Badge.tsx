import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-slate-800 text-slate-300 ring-slate-700",
  success: "bg-emerald-950 text-emerald-400 ring-emerald-800",
  warning: "bg-amber-950 text-amber-400 ring-amber-800",
  danger: "bg-red-950 text-red-400 ring-red-800",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
