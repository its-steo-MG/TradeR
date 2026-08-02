"use client";

import { Target, Grid3x3, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TradeMode = "matches" | "evenodd" | "overunder";

type Props = {
  mode: TradeMode;
  onChange: (m: TradeMode) => void;
};

const TABS = [
  { 
    key: "matches" as const, 
    shortLabel: "Match/Diff", 
    icon: Target 
  },
  { 
    key: "evenodd" as const, 
    shortLabel: "Even/Odd", 
    icon: Grid3x3 
  },
  { 
    key: "overunder" as const, 
    shortLabel: "Over/Under", 
    icon: ArrowUpDown 
  },
];

export default function ModeTabs({ mode, onChange }: Props) {
  const currentIndex = TABS.findIndex((t) => t.key === mode);

  return (
    <div className="bg-slate-950 border-b border-slate-800 py-3">
      <div className="max-w-4xl mx-auto px-4">
        <div className="inline-flex w-full bg-slate-900/70 rounded-2xl p-1.5 border border-slate-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl",
                  "text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(255, 255, 255, 0.08)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
                      }
                    : undefined
                }
              >
                {/* Clear water-drop highlight */}
                {isActive && (
                  <div
                    className="absolute inset-x-0 top-0 h-[55%] rounded-t-xl pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
                    }}
                  />
                )}

                <Icon
                  size={18}
                  className={cn(
                    "relative z-[1] flex-shrink-0",
                    isActive ? "text-blue-300" : "text-slate-500"
                  )}
                />

                <span className="relative z-[1] text-center leading-tight font-medium truncate w-full px-1">
                  <span className="block xs:hidden">
                    {tab.key === "matches"
                      ? "Match"
                      : tab.key === "evenodd"
                      ? "Even/Odd"
                      : "Over/Under"}
                  </span>
                  <span className="hidden xs:block">{tab.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliding underline */}
      <div className="relative h-0.5 mt-3 mx-auto max-w-4xl px-6">
        <div
          className="absolute h-0.5 bg-blue-400 transition-all duration-300 rounded-full"
          style={{
            left: `${currentIndex * (100 / TABS.length)}%`,
            width: `${100 / TABS.length}%`,
          }}
        />
      </div>
    </div>
  );
}