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
    case "rise": return "Rise";
    case "fall": return "Fall";
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
      <div className="rounded-lg border border-border bg-card py-12 text-center">
        <div className="text-muted-foreground text-sm">No open positions</div>
        <div className="text-muted-foreground/70 text-xs mt-1">
          Place a trade to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
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
                <ChevronDown size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {contractLabel(p)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {p.refId} · {p.marketName}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground">Stake</div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  ${p.stake.toFixed(2)}
                </div>
              </div>

              <div className="text-right ml-3">
                <div className="text-xs text-muted-foreground">Payout</div>
                <div className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  ${p.potentialPayout.toFixed(2)}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="mt-3 ml-6 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-y-1.5">
                  <span className="text-muted-foreground">Ref ID</span>
                  <span className="text-foreground font-mono">{p.refId}</span>

                  <span className="text-muted-foreground">Contract</span>
                  <span className="text-foreground">{contractLabel(p)}</span>

                  <span className="text-muted-foreground">Entry spot</span>
                  <span className="text-foreground tabular-nums">
                    {p.entrySpot.toFixed(2)}{" "}
                    <span className="text-muted-foreground">(digit {p.entryDigit})</span>
                  </span>

                  <span className="text-muted-foreground">Current spot</span>
                  <span className="text-foreground tabular-nums">
                    {currentSpot != null ? currentSpot.toFixed(2) : "—"}{" "}
                    {currentDigit != null && (
                      <span className="text-muted-foreground">(digit {currentDigit})</span>
                    )}
                  </span>

                  <span className="text-muted-foreground">Potential profit</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +${potentialProfit.toFixed(2)}
                  </span>

                  <span className="text-muted-foreground">Opened at</span>
                  <span className="text-foreground font-mono">{fmtTime(p.createdAt)}</span>

                  <span className="text-muted-foreground">Account</span>
                  <span className="text-foreground capitalize">{p.accountType}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop(p.id);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition text-sm font-medium"
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