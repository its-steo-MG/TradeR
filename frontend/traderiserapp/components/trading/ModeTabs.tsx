"use client";

import { Target, Grid3x3, ArrowUpDown } from "lucide-react";

export type TradeMode = "matches" | "evenodd" | "overunder";

type Props = {
  mode: TradeMode;
  onChange: (m: TradeMode) => void;
};

const TABS: { 
  key: TradeMode; 
  label: string; 
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { 
    key: "matches", 
    label: "Matches/Differs", 
    shortLabel: "Match/Diff", 
    icon: Target 
  },
  { 
    key: "evenodd", 
    label: "Even/Odd", 
    shortLabel: "Even/Odd", 
    icon: Grid3x3 
  },
  { 
    key: "overunder", 
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
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl 
                  text-sm font-medium transition-all duration-200 active:scale-95
                  ${isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }
                `}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-blue-400" : "text-slate-500"}
                />
                
                <span className="text-center leading-tight">
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Smooth sliding underline indicator */}
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