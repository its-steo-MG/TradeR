"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpDown, Clock, RefreshCw } from "lucide-react";
import { mt5Store } from "@/lib/mt5-store";
import { useMT5Sub } from "@/lib/use-mt5-tick";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

interface ClosedTrade {
  id: number | string;
  symbol: string;
  side: string;
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  closedAt?: number | string;
}

export default function HistoryScreen() {
  useMT5Sub();

  const [acc, setAcc] = useState<any>(null);
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [ts, setTs] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    const token = localStorage.getItem("access_token");
    let backendTrades: ClosedTrade[] = [];

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/forex/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          backendTrades = (data.trades || data.results || []).map((t: any) => {
            const position = t.position || t;
            return {
              id: t.id,
              symbol: position.symbol || position.symbol_name || t.symbol || "N/A",
              side: position.direction || position.side || t.side || "buy",
              volume: Number(position.volume_lots || position.volume || t.volume) || 0,
              openPrice: Number(position.entry_price || position.open_price || t.open_price) || 0,
              closePrice: Number(t.close_price || t.closePrice) || 0,
              profit: Number(t.realized_p_l || t.profit || t.realized_profit) || 0,
              closedAt: t.closed_at || t.closedAt,
            };
          });
        }
      } catch {
        console.warn("Failed to load backend history");
      }
    }

    const localTradesRaw = mt5Store.getHistory();
    const localTrades: ClosedTrade[] = localTradesRaw.map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side,
      volume: t.volume,
      openPrice: t.openPrice,
      closePrice: t.closePrice,
      profit: t.profit,
      closedAt: t.closedAt,
    }));

    const merged = [...backendTrades];
    localTrades.forEach((local) => {
      const exists = merged.some((b) => String(b.id) === String(local.id));
      if (!exists) merged.push(local);
    });

    merged.sort((a, b) => {
      const timeA = new Date((a as any).closedAt || 0).getTime();
      const timeB = new Date((b as any).closedAt || 0).getTime();
      return timeB - timeA;
    });

    setHistory(merged);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Load account (try backend first)
  useEffect(() => {
    const loadAccount = async () => {
      const freshAccount = await mt5Store.syncAccountFromBackend();
      if (freshAccount) {
        setAcc(freshAccount);
      } else {
        const localAcc = mt5Store.getAccount();
        setAcc(localAcc);
      }
    };

    loadAccount();
  }, []);

  // Initial load + listen for updates
  useEffect(() => {
    fetchHistory();
    const handleUpdate = () => fetchHistory(false);
    window.addEventListener("mt5:update", handleUpdate);
    return () => window.removeEventListener("mt5:update", handleUpdate);
  }, [fetchHistory]);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTs(
        `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ` +
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real vs Demo detection
  const isRealAccount =
    acc?.type === "real" ||
    acc?.account_type === "standard" ||
    acc?.account_type === "mt5";

  const deposit = isRealAccount ? (acc?.balance ?? 0) : 100000;
  const totalProfit = history.reduce((sum, t) => sum + t.profit, 0);
  const balance = acc?.balance ?? (isRealAccount ? 0 : 100000);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace(/,/g, " ");

  return (
    <div className="pb-20 bg-black text-white min-h-screen">
      {/* Header */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-3 pb-3 border-b border-white/10">
        <button
          onClick={() => fetchHistory()}
          disabled={refreshing}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 active:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 text-white/80 ${refreshing ? "animate-spin" : ""}`} />
        </button>

        <div className="mx-auto flex items-center gap-1 rounded-full bg-[#1c1c1e] p-1">
          <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-semibold text-white">Deals</span>
          <span className="px-3 py-1 text-sm text-white/60">History</span>
        </div>

        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
          <Clock className="h-4 w-4 text-white/80" />
        </button>
      </header>

      {/* Balance Summary */}
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[17px] font-bold text-white">Balance</div>
          <div className="text-[17px] font-bold tabular-nums text-white">{fmt(balance)}</div>
        </div>
        <div className="mt-1 text-right text-[12px] text-white/50 tabular-nums">{ts}</div>

        <dl className="mt-5 space-y-[6px] text-[15px]">
          <Row k="Deposit" v={fmt(deposit)} />
          <Row k="Profit" v={`${totalProfit >= 0 ? "+" : ""}${fmt(totalProfit)}`} />
          <Row k="Swap" v="0.00" />
          <Row k="Commission" v="0.00" />
          <Row k="Balance" v={fmt(balance)} />
        </dl>
      </div>

      {/* Deals List */}
      <div className="mt-6 px-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-sm font-semibold text-white/80">Closed Trades</div>
          <div className="text-xs text-white/50">{history.length} deals</div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white/40 text-sm">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            No closed trades yet.<br />
            Close a trade from the Chart or Trade screen.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f10] overflow-hidden divide-y divide-white/10">
            {history.map((trade, index) => (
              <div key={trade.id || index} className="px-4 py-3.5 active:bg-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white tracking-wide text-[15px]">
                      {trade.symbol}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {trade.side.toUpperCase()} {(trade.volume || 0).toFixed(2)} lot
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/60 tabular-nums">
                      {(trade.openPrice || 0).toFixed(5)} → {(trade.closePrice || 0).toFixed(5)}
                    </div>
                    <div className={`text-[15px] font-semibold tabular-nums mt-0.5 ${trade.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {trade.profit >= 0 ? "+" : ""}{fmt(trade.profit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <dt className="text-white/80">{k}</dt>
      <dd className="text-white tabular-nums font-medium text-[15px]">{v}</dd>
    </div>
  );
}