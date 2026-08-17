"use client";

import {
  Radar,
  LineChart,
  MousePointerClick,
  BarChart3,
  Bot,
  LayoutDashboard,
  Lock,
} from "lucide-react";

export type TerminalTab =
  | "bulk"
  | "dtrader"
  | "manual"
  | "analysis"
  | "botbuilder"
  | "dashboard";

type Props = {
  active: TerminalTab;
  onChange: (tab: TerminalTab) => void;
  locked?: TerminalTab[];
  badges?: Partial<Record<TerminalTab, string | undefined>>;
};

const TABS: { key: TerminalTab; label: string; Icon: typeof Radar }[] = [
  { key: "bulk", label: "Bulk Scanner", Icon: Radar },
  { key: "dtrader", label: "DTrader", Icon: LineChart },
  { key: "manual", label: "Manual Trader", Icon: MousePointerClick },
  { key: "analysis", label: "Analysis Tool", Icon: BarChart3 },
  { key: "botbuilder", label: "Bot Builder", Icon: Bot },
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
];

export default function TerminalTabs({ active, onChange, locked = [], badges }: Props) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] px-2 sm:px-4 lg:px-8">
        <div className="flex items-stretch gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key;
            const isLocked = locked.includes(key);
            const badge = badges?.[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => !isLocked && onChange(key)}
                title={isLocked ? `${label} — coming soon` : label}
                className={
                  "relative shrink-0 flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-[13px] font-medium whitespace-nowrap transition-colors " +
                  (isActive
                    ? "text-white"
                    : isLocked
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-400 hover:text-slate-200")
                }
              >
                <Icon className={isActive ? "w-4 h-4 text-blue-400" : "w-4 h-4"} />
                <span>{label}</span>

                {isLocked && <Lock className="w-3 h-3 text-slate-600" />}

                {badge && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 tracking-wide">
                    {badge}
                  </span>
                )}

                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
