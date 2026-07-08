"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpDown, Clock } from "lucide-react";
import { mt5Store } from "@/lib/mt5-store";
import { useMT5Sub, useMT5Tick } from "@/lib/use-mt5-tick";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

type Tab = "positions" | "orders" | "deals";

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
  useMT5Tick();

  const [tab, setTab] = useState<Tab>("positions");
  const [acc, setAcc] = useState<any>(null);
  const [history, setHistory] = useState<ClosedTrade[]>([]);
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

  useEffect(() => {
    const loadAccount = async () => {
      const freshAccount = await mt5Store.syncAccountFromBackend();
      if (freshAccount) setAcc(freshAccount);
      else setAcc(mt5Store.getAccount());
    };
    loadAccount();
  }, []);

  useEffect(() => {
    fetchHistory();
    const handleUpdate = () => fetchHistory(false);
    window.addEventListener("mt5:update", handleUpdate);
    return () => window.removeEventListener("mt5:update", handleUpdate);
  }, [fetchHistory]);

  // ============ derived ============
  const isRealAccount =
    acc?.type === "real" ||
    acc?.account_type === "standard" ||
    acc?.account_type === "mt5";

  const deposit = isRealAccount ? (acc?.balance ?? 0) : 100000;
  const totalProfit = history.reduce((sum, t) => sum + t.profit, 0);
  const balance = acc?.balance ?? (isRealAccount ? 0 : 100000);

  const fmt = (n: number) =>
    n
      .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/,/g, " ");

  const fmtDate = (d?: number | string) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const M = String(dt.getMonth() + 1).padStart(2, "0");
    const D = String(dt.getDate()).padStart(2, "0");
    const h = String(dt.getHours()).padStart(2, "0");
    const m = String(dt.getMinutes()).padStart(2, "0");
    const s = String(dt.getSeconds()).padStart(2, "0");
    return `${y}.${M}.${D} ${h}:${m}:${s}`;
  };

  return (
    <div className="pb-24 bg-black text-white min-h-screen">
      {/* ================= HEADER ================= */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-3 pb-3">
        <button
          onClick={() => fetchHistory()}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 active:bg-white/10"
          aria-label="Sort"
        >
          <ArrowUpDown className={`h-4 w-4 text-white/80 ${refreshing ? "animate-pulse" : ""}`} />
        </button>

        {/* Pill tab switcher */}
        <div className="mx-auto flex items-center rounded-full bg-[#1c1c1e] p-1">
          <TabPill active={tab === "positions"} onClick={() => setTab("positions")}>
            Positions
          </TabPill>
          <TabPill active={tab === "orders"} onClick={() => setTab("orders")}>
            Orders
          </TabPill>
          <TabPill active={tab === "deals"} onClick={() => setTab("deals")}>
            Deals
          </TabPill>
        </div>

        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5" aria-label="Time">
          <Clock className="h-4 w-4 text-white/80" />
        </button>
      </header>

      {loading ? (
        <div className="text-center py-16 text-white/40 text-sm">Loading history...</div>
      ) : tab === "positions" ? (
        <PositionsTab
          history={history}
          balance={balance}
          deposit={deposit}
          totalProfit={totalProfit}
          fmt={fmt}
          fmtDate={fmtDate}
        />
      ) : tab === "orders" ? (
        <OrdersTab history={history} fmtDate={fmtDate} />
      ) : (
        <DealsTab
          history={history}
          balance={balance}
          deposit={deposit}
          totalProfit={totalProfit}
          fmt={fmt}
          fmtDate={fmtDate}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/* Tab pill                                                     */
/* ============================================================ */
function TabPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
        active ? "bg-white/10 text-white font-semibold" : "text-white/60"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================ */
/* POSITIONS TAB — mirrors screenshot IMG_0420                  */
/* ============================================================ */
function PositionsTab({
  history,
  balance,
  deposit,
  totalProfit,
  fmt,
  fmtDate,
}: {
  history: ClosedTrade[];
  balance: number;
  deposit: number;
  totalProfit: number;
  fmt: (n: number) => string;
  fmtDate: (d?: number | string) => string;
}) {
  const openBalanceDate = fmtDate(Date.now() - 2 * 24 * 3600 * 1000);

  return (
    <div>
      {/* Opening Balance row */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[17px] font-bold text-white">Balance</div>
          <div className="text-[17px] font-bold tabular-nums text-sky-400">{fmt(deposit)}</div>
        </div>
        <div className="text-right text-[12px] text-white/50 tabular-nums mt-0.5">
          {openBalanceDate}
        </div>
      </div>

      {/* Rows */}
      <div>
        {history.map((t, i) => (
          <div key={t.id || i} className="px-4 py-2.5 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div className="text-[15px]">
                <span className="font-bold text-white">{t.symbol}</span>{" "}
                <span className={t.side.toLowerCase() === "sell" ? "text-rose-400" : "text-sky-400"}>
                  {t.side.toLowerCase()}
                </span>{" "}
                <span className="text-white/80 tabular-nums">{(t.volume || 0).toFixed(2)}</span>
              </div>
              <div
                className={`text-[15px] font-semibold tabular-nums ${
                  t.profit >= 0 ? "text-sky-400" : "text-rose-400"
                }`}
              >
                {t.profit >= 0 ? "" : "-"}
                {Math.abs(t.profit).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-[13px] text-white/50 tabular-nums">
                {(t.openPrice || 0).toFixed(5)} → {(t.closePrice || 0).toFixed(5)}
              </div>
              <div className="text-[13px] text-white/50 tabular-nums">{fmtDate(t.closedAt)}</div>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-10 text-white/40 text-sm">No closed positions</div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 border-t border-white/10 px-4 py-3 space-y-1.5">
        <SummaryRow k="Deposit" v={fmt(deposit)} />
        <SummaryRow
          k="Profit"
          v={`${totalProfit >= 0 ? "" : "-"}${Math.abs(totalProfit).toFixed(2)}`}
          valueClass={totalProfit >= 0 ? "text-sky-400" : "text-rose-400"}
        />
        <SummaryRow k="Swap" v="0.00" />
        <SummaryRow k="Commission" v="0.00" />
        <SummaryRow k="Balance" v={fmt(balance)} bold />
      </div>
    </div>
  );
}

/* ============================================================ */
/* ORDERS TAB — mirrors screenshot IMG_0421 / IMG_0418          */
/* ============================================================ */
function OrdersTab({
  history,
  fmtDate,
}: {
  history: ClosedTrade[];
  fmtDate: (d?: number | string) => string;
}) {
  // Every closed trade corresponds to 2 filled market orders (entry + exit).
  const orders: {
    id: string;
    symbol: string;
    side: string;
    volume: number;
    at: number | string | undefined;
  }[] = [];
  history.forEach((t) => {
    orders.push({
      id: `${t.id}-open`,
      symbol: t.symbol,
      side: t.side,
      volume: t.volume,
      at: t.closedAt,
    });
    orders.push({
      id: `${t.id}-close`,
      symbol: t.symbol,
      side: t.side.toLowerCase() === "buy" ? "sell" : "buy",
      volume: t.volume,
      at: t.closedAt,
    });
  });

  return (
    <div>
      <div>
        {orders.map((o) => (
          <div key={o.id} className="px-4 py-2.5 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div className="text-[15px]">
                <span className="font-bold text-white">{o.symbol}</span>{" "}
                <span className={o.side.toLowerCase() === "sell" ? "text-rose-400" : "text-sky-400"}>
                  {o.side.toLowerCase()}
                </span>
              </div>
              <div className="text-[14px] text-sky-400">filled</div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-[13px] text-white/50 tabular-nums">
                {(o.volume || 0).toFixed(2)} / {(o.volume || 0).toFixed(2)} at market
              </div>
              <div className="text-[13px] text-white/50 tabular-nums">{fmtDate(o.at)}</div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-10 text-white/40 text-sm">No orders</div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-6 border-t border-white/10 px-4 py-3 space-y-1.5">
        <SummaryRow k="Total" v={String(orders.length)} />
        <SummaryRow k="Filled" v={String(orders.length)} />
        <SummaryRow k="Canceled" v="0" />
      </div>
    </div>
  );
}

/* ============================================================ */
/* DEALS TAB — mirrors screenshot IMG_0417                      */
/* ============================================================ */
function DealsTab({
  history,
  balance,
  deposit,
  totalProfit,
  fmt,
  fmtDate,
}: {
  history: ClosedTrade[];
  balance: number;
  deposit: number;
  totalProfit: number;
  fmt: (n: number) => string;
  fmtDate: (d?: number | string) => string;
}) {
  // Each closed trade = 1 in (entry) + 1 out (exit) deal
  type Deal = {
    id: string;
    symbol: string;
    side: string;
    kind: "in" | "out";
    volume: number;
    price: number;
    profit: number;
    at: number | string | undefined;
  };
  const deals: Deal[] = [];
  history.forEach((t) => {
    deals.push({
      id: `${t.id}-in`,
      symbol: t.symbol,
      side: t.side,
      kind: "in",
      volume: t.volume,
      price: t.openPrice,
      profit: 0,
      at: t.closedAt,
    });
    deals.push({
      id: `${t.id}-out`,
      symbol: t.symbol,
      side: t.side.toLowerCase() === "buy" ? "sell" : "buy",
      kind: "out",
      volume: t.volume,
      price: t.closePrice,
      profit: t.profit,
      at: t.closedAt,
    });
  });

  return (
    <div>
      <div>
        {deals.map((d) => (
          <div key={d.id} className="px-4 py-2.5 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div className="text-[15px]">
                <span className="font-bold text-white">{d.symbol}</span>{" "}
                <span className={d.side.toLowerCase() === "sell" ? "text-rose-400" : "text-sky-400"}>
                  {d.side.toLowerCase()}, {d.kind}
                </span>
              </div>
              <div
                className={`text-[15px] font-semibold tabular-nums ${
                  d.profit === 0
                    ? "text-white/70"
                    : d.profit >= 0
                    ? "text-sky-400"
                    : "text-rose-400"
                }`}
              >
                {d.profit === 0
                  ? "0.00"
                  : `${d.profit >= 0 ? "" : "-"}${Math.abs(d.profit).toFixed(2)}`}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-[13px] text-white/50 tabular-nums">
                {(d.volume || 0).toFixed(2)} at {(d.price || 0).toFixed(5)}
              </div>
              <div className="text-[13px] text-white/50 tabular-nums">{fmtDate(d.at)}</div>
            </div>
          </div>
        ))}

        {deals.length === 0 && (
          <div className="text-center py-10 text-white/40 text-sm">No deals</div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 border-t border-white/10 px-4 py-3 space-y-1.5">
        <SummaryRow k="Deposit" v={fmt(deposit)} />
        <SummaryRow
          k="Profit"
          v={`${totalProfit >= 0 ? "" : "-"}${Math.abs(totalProfit).toFixed(2)}`}
          valueClass={totalProfit >= 0 ? "text-sky-400" : "text-rose-400"}
        />
        <SummaryRow k="Swap" v="0.00" />
        <SummaryRow k="Commission" v="0.00" />
        <SummaryRow k="Balance" v={fmt(balance)} bold />
      </div>
    </div>
  );
}

/* ============================================================ */
function SummaryRow({
  k,
  v,
  valueClass = "text-white",
  bold = false,
}: {
  k: string;
  v: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[15px]">
      <span className={`text-white ${bold ? "font-semibold" : ""}`}>{k}</span>
      <span className={`tabular-nums ${valueClass} ${bold ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}
