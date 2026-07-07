"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import OpenPositions from "./OpenPositions";
import ClosedPositions from "./ClosedPositions";
import Statement from "./statement";
import type {
  OpenPosition,
  ClosedPosition,
  StatementEntry,
} from "@/lib/types/positions";

type Tab = "open" | "closed" | "statement";

type Props = {
  open: OpenPosition[];
  closed: ClosedPosition[];
  statement: StatementEntry[];
  currentSpot: number | null;
  currentDigit: number | null;
  onStopOpen: (id: string) => void;
  onClearHistory: () => void;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "statement", label: "Statement" },
];

export default function PositionsPanel({
  open,
  closed,
  statement,
  currentSpot,
  currentDigit,
  onStopOpen,
  onClearHistory,
}: Props) {
  const [tab, setTab] = useState<Tab>("open");

  const counts: Record<Tab, number> = {
    open: open.length,
    closed: closed.length,
    statement: statement.length,
  };

  return (
    <div className="space-y-3">
      {/* Tab pills (Deriv-style) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition border ${
                active
                  ? "bg-slate-800 text-white border-slate-700"
                  : "bg-transparent text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}

        {(tab === "closed" || tab === "statement") &&
          counts[tab] > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all history for this view? (cannot be undone)")) {
                  onClearHistory();
                }
              }}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-rose-400 transition"
              title="Clear history"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
      </div>

      {/* Panels */}
      <div>
        {tab === "open" && (
          <OpenPositions
            positions={open}
            currentSpot={currentSpot}
            currentDigit={currentDigit}
            onStop={onStopOpen}
          />
        )}
        {tab === "closed" && <ClosedPositions positions={closed} />}
        {tab === "statement" && <Statement entries={statement} />}
      </div>
    </div>
  );
}