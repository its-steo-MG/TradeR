"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ClosedPosition } from "@/lib/types/positions";

type Props = { positions: ClosedPosition[] };

function contractLabel(p: ClosedPosition): string {
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

function fmtDateTime(ts: number) {
  const d = new Date(ts);
  const date = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  return `${date} ${time}`;
}

export default function ClosedPositions({ positions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-12 text-center">
        <div className="text-muted-foreground text-sm">No closed positions</div>
        <div className="text-muted-foreground/70 text-xs mt-1">
          Settled trades will appear here
        </div>
      </div>
    );
  }

  const totalProfit = positions.reduce((s, p) => s + p.profit, 0);
  const wins = positions.filter((p) => p.outcome === "W").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-card border border-border px-4 py-2.5 text-xs">
        <div className="text-muted-foreground">
          <span className="text-foreground font-semibold">{positions.length}</span> trades ·{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wins}W</span>{" "}
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {positions.length - wins}L
          </span>
        </div>
        <div
          className={`font-semibold tabular-nums ${
            totalProfit >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          Total: {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {positions.map((p) => {
          const isOpen = expanded === p.id;
          const won = p.outcome === "W";

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

                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    won
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {p.outcome}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {contractLabel(p)}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.refId} · {fmtDateTime(p.closedAt)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Stake</div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">
                    ${p.stake.toFixed(2)}
                  </div>
                </div>

                <div className="text-right ml-3">
                  <div className="text-[11px] text-muted-foreground">P/L</div>
                  <div
                    className={`text-sm font-semibold tabular-nums ${
                      won
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {won ? "+" : ""}${p.profit.toFixed(2)}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 ml-6 grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Ref ID</span>
                  <span className="text-foreground font-mono">{p.refId}</span>
                  <span className="text-muted-foreground">Contract</span>
                  <span className="text-foreground">{contractLabel(p)}</span>
                  <span className="text-muted-foreground">Market</span>
                  <span className="text-foreground truncate">{p.marketName}</span>
                  <span className="text-muted-foreground">Stake</span>
                  <span className="text-foreground tabular-nums">${p.stake.toFixed(2)}</span>
                  <span className="text-muted-foreground">Multiplier</span>
                  <span className="text-foreground tabular-nums">×{p.multiplier.toFixed(3)}</span>
                  <span className="text-muted-foreground">Payout</span>
                  <span className="text-foreground tabular-nums">${p.payout.toFixed(2)}</span>
                  <span className="text-muted-foreground">Entry spot</span>
                  <span className="text-foreground tabular-nums">
                    {p.entrySpot.toFixed(2)}{" "}
                    <span className="text-muted-foreground">(digit {p.entryDigit})</span>
                  </span>
                  <span className="text-muted-foreground">Exit spot</span>
                  <span className="text-foreground tabular-nums">
                    {p.exitSpot.toFixed(2)}{" "}
                    <span className="text-muted-foreground">(digit {p.exitDigit})</span>
                  </span>
                  <span className="text-muted-foreground">Opened</span>
                  <span className="text-foreground font-mono">{fmtDateTime(p.createdAt)}</span>
                  <span className="text-muted-foreground">Closed</span>
                  <span className="text-foreground font-mono">{fmtDateTime(p.closedAt)}</span>
                  <span className="text-muted-foreground">Outcome</span>
                  <span
                    className={
                      won
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-rose-600 dark:text-rose-400 font-semibold"
                    }
                  >
                    {won ? "Won" : "Lost"}
                  </span>
                  <span className="text-muted-foreground">Profit/Loss</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      won
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {won ? "+" : ""}${p.profit.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">Account</span>
                  <span className="text-foreground capitalize">{p.accountType}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}