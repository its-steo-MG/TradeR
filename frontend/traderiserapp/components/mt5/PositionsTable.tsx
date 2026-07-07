"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mt5Store, calcProfit } from "@/lib/mt5-store";
import { playCloseTradeSound } from "@/lib/mt5-sounds";

interface Position {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  openPrice: number;
  currentPrice: number;
  floating_p_l: number;
  sl?: number;
  tp?: number;
}

interface PositionsTableProps {
  positions: Position[];
  compact?: boolean;
  onPositionClosed?: () => void;
}

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

export default function PositionsTable({ 
  positions, 
  compact = false,
  onPositionClosed 
}: PositionsTableProps) {

  const [closingId, setClosingId] = useState<number | null>(null);

  const closePosition = async (position: Position) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error("Please login again");
      return;
    }

    setClosingId(position.id);

    try {
      const res = await fetch(`${API_BASE}/api/forex/positions/${position.id}/close/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to close position");
      }

      playCloseTradeSound();
      toast.success(`Closed ${position.symbol} successfully`);

      // Clean up local mt5Store if the position exists there
      const current = mt5Store.getPositions();
      const updated = current.filter(p => String(p.id) !== String(position.id));
      mt5Store.setPositions(updated);

      if (onPositionClosed) {
        onPositionClosed();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to close position");
    } finally {
      setClosingId(null);
    }
  };

  if (!positions.length) {
    return (
      <div className="grid h-32 place-items-center rounded-xl border border-dashed border-white/10 text-sm text-white/40">
        No open positions
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f172a]">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
          <tr>
            <th className="px-3 py-2 text-left">Symbol</th>
            <th className="px-3 py-2 text-left">Side</th>
            <th className="px-3 py-2 text-right">Volume</th>
            <th className="px-3 py-2 text-right">Open</th>
            <th className="px-3 py-2 text-right">Price</th>
            {!compact && <th className="px-3 py-2 text-right">SL / TP</th>}
            <th className="px-3 py-2 text-right">P&L</th>
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            // Use fast local calcProfit for live P/L (consistent with Chart & TradeScreen)
            const liveProfit = calcProfit({
              id: String(p.id),
              symbol: p.symbol,
              side: p.side,
              volume: p.volume,
              openPrice: p.openPrice,
              currentPrice: p.currentPrice,
              openedAt: Date.now(),
              swap: 0,
              commission: 0,
            });

            const isClosing = closingId === p.id;

            return (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-semibold text-white">{p.symbol}</td>
                <td className={`px-3 py-2 ${p.side === "buy" ? "text-sky-400" : "text-rose-400"}`}>
                  {p.side.toUpperCase()}
                </td>
                <td className="px-3 py-2 text-right text-white tabular-nums">
                  {p.volume.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-white/70 tabular-nums">
                  {p.openPrice}
                </td>
                <td className="px-3 py-2 text-right text-white tabular-nums">
                  {p.currentPrice}
                </td>
                {!compact && (
                  <td className="px-3 py-2 text-right text-white/50 tabular-nums">
                    {p.sl ?? "—"} / {p.tp ?? "—"}
                  </td>
                )}
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${liveProfit >= 0 ? "text-sky-400" : "text-rose-400"}`}>
                  {liveProfit >= 0 ? "+" : ""}{liveProfit.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => closePosition(p)}
                    disabled={isClosing}
                    className="rounded-md bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-50"
                  >
                    {isClosing ? "Closing..." : "Close"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}