"use client";

import { BarChart3, Clock } from "lucide-react";

type Props = {
  tab: "trade" | "positions";
  onChange: (t: "trade" | "positions") => void;
  openCount?: number;
};

export default function BottomNav({ tab, onChange, openCount = 0 }: Props) {
  const items = [
    { key: "trade" as const, label: "Trade", Icon: BarChart3 },
    { key: "positions" as const, label: "Positions", Icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 border-t border-slate-800 bg-slate-950">
      {items.map(({ key, label, Icon }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="relative flex flex-col items-center gap-1 py-3"
          >
            <div className="relative">
              <Icon
                size={20}
                className={active ? "text-blue-400" : "text-slate-500"}
              />
              {key === "positions" && openCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {openCount > 99 ? "99+" : openCount}
                </span>
              )}
            </div>
            <span
              className={`text-xs ${
                active ? "text-blue-400" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
