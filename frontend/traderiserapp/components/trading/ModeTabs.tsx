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
    label: "Matches/Differs", 
    shortLabel: "Match/Diff", 
    icon: Target 
  },
  { 
    key: "evenodd" as const, 
    label: "Even/Odd", 
    shortLabel: "Even/Odd", 
    icon: Grid3x3 
  },
  { 
    key: "overunder" as const, 
    label: "Over/Under", 
    shortLabel: "Over/Under", 
    icon: ArrowUpDown 
  },
];

export default function ModeTabs({ mode, onChange }: Props) {
  const currentIndex = TABS.findIndex((t) => t.key === mode);

  return (
    <div className="bg-slate-950 border-b border-slate-800 py-3">
      <div className="max-w-4xl mx-auto px-4">
        <div className="inline-flex w-full bg-slate-900 rounded-2xl p-1.5 border border-slate-800 shadow-inner">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl",
                  "text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                {/* Icon */}
                <Icon
                  size={18}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-blue-400" : "text-slate-500"
                  )}
                />

                {/* Text - Responsive */}
                <span className="text-center leading-tight font-medium truncate w-full px-1">
                  {/* Very small screens: show shortened but understandable names */}
                  <span className="block xs:hidden">
                    {tab.key === "matches" ? "Match" : 
                     tab.key === "evenodd" ? "Even/Odd" : "Over/Under"}
                  </span>
                  
                  {/* Small to medium screens */}
                  <span className="hidden xs:block">
                    {tab.shortLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliding underline indicator */}
      <div className="relative h-0.5 mt-3 mx-auto max-w-4xl px-6">
        <div
          className="absolute h-0.5 bg-blue-500 transition-all duration-300 rounded-full"
          style={{
            left: `${currentIndex * (100 / TABS.length)}%`,
            width: `${100 / TABS.length}%`,
          }}
        />
      </div>
    </div>
  );
}