"use client";

import { Target, Grid3x3, ArrowUpDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type TradeMode = "matches" | "evenodd" | "overunder" | "risefall";

type Props = {
  mode: TradeMode;
  onChange: (m: TradeMode) => void;
};

const TABS = [
  { key: "matches" as const, shortLabel: "Match/Diff", icon: Target },
  { key: "evenodd" as const, shortLabel: "Even/Odd", icon: Grid3x3 },
  { key: "overunder" as const, shortLabel: "Over/Under", icon: ArrowUpDown },
  { key: "risefall" as const, shortLabel: "Rise/Fall", icon: TrendingUp },
];

export default function ModeTabs({ mode, onChange }: Props) {
  const currentIndex = TABS.findIndex((t) => t.key === mode);

  return (
    <div className="bg-background border-b border-border py-3">
      <div className="max-w-4xl mx-auto px-4">
        <div className="inline-flex w-full bg-muted rounded-2xl p-1.5 border border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl overflow-hidden",
                  "text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                  isActive
                    ? "drop-on-top drop-selected bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "relative z-[1] flex-shrink-0",
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                  )}
                />
                <span className="relative z-[1] text-center leading-tight font-medium truncate w-full px-1">
                  <span className="block xs:hidden">
                    {tab.key === "matches"
                      ? "Match"
                      : tab.key === "evenodd"
                      ? "Even/Odd"
                      : tab.key === "risefall"
                      ? "Rise/Fall"
                      : "Over/Under"}
                  </span>
                  <span className="hidden xs:block">{tab.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
