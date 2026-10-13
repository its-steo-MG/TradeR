"use client";

import { useGlassMode, type GlassMode } from "@/hooks/use-glass-mode";

const OPTIONS: { id: GlassMode; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "frosted", label: "Frosted" },
  { id: "solid", label: "Solid" },
];

export function GlassControl() {
  const { mode, setMode } = useGlassMode();

  return (
    <div className="flex items-center justify-between px-2 gap-2">
      <span className="text-xs text-slate-500 dark:text-white/60 font-medium">Glass</span>
      <div className="flex rounded-full bg-white/40 dark:bg-white/10 p-0.5 backdrop-blur-md">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all ${
              mode === opt.id
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow"
                : "text-slate-500 dark:text-white/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
