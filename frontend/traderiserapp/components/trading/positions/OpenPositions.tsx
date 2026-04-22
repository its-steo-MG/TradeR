"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { OpenPosition } from "@/lib/types/positions";

type Props = {
  positions: OpenPosition[];
  currentSpot: number | null;
  currentDigit: number | null;
  onStop: (id: string) => void;
};

function contractLabel(p: OpenPosition): string {
  switch (p.contractKind) {
    case "over": return `Over ${p.barrier}`;
    case "under": return `Under ${p.barrier}`;
    case "matches": return `Matches ${p.barrier}`;
    case "differs": return `Differs ${p.barrier}`;
    case "even": return "Even";
    case "odd": return "Odd";
  }
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export default function OpenPositions({
  positions,
  currentSpot,
  currentDigit,
  onStop,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 py-12 text-center">
        <div className="text-slate-500 text-sm">No open positions</div>
        <div className="text-slate-600 text-xs mt-1">
          Place a trade to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800">
      {positions.map((p) => {
        const isOpen = expanded === p.id;
        const potentialProfit = p.potentialPayout - p.stake;

        return (
          <div key={p.id} className="px-3 py-3">
            <button
              onClick={() => setExpanded(isOpen ? null : p.id)}
              className="w-full flex items-center gap-3 text-left"
            >
              {isOpen ? (
                <ChevronDown size={16} className="text-slate-500 shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-slate-500 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {contractLabel(p)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {p.refId} · {p.marketName}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Stake</div>
                <div className="text-sm font-semibold tabular-nums text-white">
                  ${p.stake.toFixed(2)}
                </div>
              </div>

              <div className="text-right ml-3">
                <div className="text-xs text-slate-400">Payout</div>
                <div className="text-sm font-semibold tabular-nums text-emerald-400">
                  ${p.potentialPayout.toFixed(2)}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="mt-3 ml-6 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-y-1.5">
                  <span className="text-slate-500">Ref ID</span>
                  <span className="text-slate-200 font-mono">{p.refId}</span>

                  <span className="text-slate-500">Contract</span>
                  <span className="text-slate-200">{contractLabel(p)}</span>

                  <span className="text-slate-500">Entry spot</span>
                  <span className="text-slate-200 tabular-nums">
                    {p.entrySpot.toFixed(2)} <span className="text-slate-500">(digit {p.entryDigit})</span>
                  </span>

                  <span className="text-slate-500">Current spot</span>
                  <span className="text-slate-200 tabular-nums">
                    {currentSpot != null ? currentSpot.toFixed(2) : "—"}{" "}
                    {currentDigit != null && <span className="text-slate-500">(digit {currentDigit})</span>}
                  </span>

                  <span className="text-slate-500">Potential profit</span>
                  <span className="text-emerald-400 tabular-nums">
                    +${potentialProfit.toFixed(2)}
                  </span>

                  <span className="text-slate-500">Opened at</span>
                  <span className="text-slate-200 font-mono">
                    {fmtTime(p.createdAt)}
                  </span>

                  <span className="text-slate-500">Account</span>
                  <span className="text-slate-200 capitalize">
                    {p.accountType}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop(p.id);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition text-sm font-medium"
                >
                  Cancel Position
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}