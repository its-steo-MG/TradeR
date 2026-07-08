"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, CreditCard, ArrowDownUp, FilePlus2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { playCloseTradeSound } from "@/lib/mt5-sounds";
import { mt5Store, calcProfit, positionMargin, addClosedTrade } from "@/lib/mt5-store";
import { useMT5Sub, useMT5Tick } from "@/lib/use-mt5-tick";
import MT5Sidebar from "./MT5Sidebar";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

export default function TradeScreen() {
  useMT5Sub();
  useMT5Tick();

  const router = useRouter();
  const [positions, setPositions] = useState<any[]>([]);
  const [mt5Account, setMt5Account] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const loadPositions = () => {
    mt5Store.refreshPositions();
    setPositions(mt5Store.getPositions());
  };

  const syncAll = () => {
    loadPositions();
    const fresh = mt5Store.getAccount();
    if (fresh) {
      setMt5Account({
        ...fresh,
        balance: Number(fresh.balance) || 0,
        leverage: Number(fresh.leverage) || 500,
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedAccount = localStorage.getItem("mt5_account");

    if (!token || !savedAccount) {
      router.replace("/mt5");
      return;
    }

    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {}

    const initialize = async () => {
      try {
        const freshAccount = await mt5Store.syncAccountFromBackend();
        if (freshAccount) {
          setMt5Account({
            ...freshAccount,
            balance: Number(freshAccount.balance) || 0,
            leverage: Number(freshAccount.leverage) || 500,
          });
        } else {
          const acc = JSON.parse(savedAccount);
          setMt5Account({
            ...acc,
            balance: Number(acc.balance) || 0,
            leverage: Number(acc.leverage) || 500,
          });
        }
      } catch (e) {
        console.warn("Failed to sync MT5 account");
      }

      await mt5Store.fetchPositionsFromBackend();
      await mt5Store.fetchSashiStatus();
      loadPositions();
      setLoading(false);
    };

    initialize();

    const handleUpdate = () => syncAll();
    const handleMarginWarning = (e: CustomEvent) => {
      syncAll();
      if (e.detail?.message) {
        toast.warning(e.detail.message, {
          duration: 5000,
          description: "Your margin level is getting low. Consider reducing positions.",
        });
      }
    };
    const handleStopOut = (e: CustomEvent) => {
      syncAll();
      if (e.detail?.message) {
        toast.error(e.detail.message, {
          duration: 7000,
          description: "All open positions were automatically closed due to Stop Out.",
        });
      }
    };
    const handleEAClosed = () => {
      syncAll();
      loadPositions();
    };

    window.addEventListener("mt5:update", handleUpdate);
    window.addEventListener("mt5:margin-warning", handleMarginWarning as EventListener);
    window.addEventListener("mt5:stop-out", handleStopOut as EventListener);
    window.addEventListener("mt5:ea-closed", handleEAClosed as EventListener);

    return () => {
      window.removeEventListener("mt5:update", handleUpdate);
      window.removeEventListener("mt5:margin-warning", handleMarginWarning as EventListener);
      window.removeEventListener("mt5:stop-out", handleStopOut as EventListener);
      window.removeEventListener("mt5:ea-closed", handleEAClosed as EventListener);
    };
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      mt5Store.checkMarginCall();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const closePosition = async (position: any) => {
    const token = localStorage.getItem("access_token");
    if (!token || !position) return 0;
    const finalProfit = calcProfit(position);
    try {
      await fetch(`${API_BASE}/api/mt5/positions/close/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ position_id: position.id, close_price: position.currentPrice }),
      });
    } catch (e) {
      console.warn("Backend close failed", e);
    }
    addClosedTrade({
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      volume: position.volume,
      openPrice: position.openPrice,
      currentPrice: position.currentPrice,
      closePrice: position.currentPrice,
      profit: finalProfit,
      closedAt: Date.now(),
      openedAt: position.openedAt,
      swap: position.swap || 0,
      commission: position.commission || 0,
    });
    mt5Store.updateAccountBalance(finalProfit);
    mt5Store.refreshPositions();
    loadPositions();
    return finalProfit || 0;
  };

  const closeAll = async () => {
    setShowHeaderMenu(false);
    if (positions.length === 0) return;
    const toClose = [...positions];
    for (const pos of toClose) await closePosition(pos);
    mt5Store.setPositions([]);
    syncAll();
    playCloseTradeSound();
    toast.success(`Closed ${toClose.length} positions`);
  };

  const closeProfitable = async () => {
    setShowHeaderMenu(false);
    const profitable = positions.filter((p: any) => calcProfit(p) > 0);
    if (profitable.length === 0) return toast.info("No profitable positions");
    for (const pos of [...profitable]) await closePosition(pos);
    syncAll();
    playCloseTradeSound();
    toast.success(`Closed ${profitable.length} profitable positions`);
  };

  const closeLosing = async () => {
    setShowHeaderMenu(false);
    const losing = positions.filter((p: any) => calcProfit(p) < 0);
    if (losing.length === 0) return toast.info("No losing positions");
    for (const pos of [...losing]) await closePosition(pos);
    syncAll();
    playCloseTradeSound();
    toast.success(`Closed ${losing.length} losing positions`);
  };

  const goToWallet = () => router.push("/wallet");

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );

  const hasPositions = positions.length > 0;
  const totalPnL = positions.reduce((sum: number, p: any) => sum + (calcProfit(p) || 0), 0);
  const leverage = mt5Account?.leverage || 500;
  const margin = hasPositions
    ? positions.reduce((sum, p) => sum + (positionMargin(p, leverage) || 0), 0)
    : 0;
  const balance = mt5Account?.balance || 0;
  const equity = balance + totalPnL;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  const fmt = (n: number) =>
    (n || 0)
      .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/,/g, " ");

  const isReal =
    mt5Account?.type === "real" ||
    mt5Account?.account_type === "mt5" ||
    mt5Account?.account_type === "standard";

  return (
    <div className="min-h-screen bg-black text-white pb-4">
      {/* ==== Top Bar (matches real MT5 dark screenshot) ==== */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="grid h-9 w-9 place-items-center -ml-1 text-white/90 active:opacity-70"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium text-white leading-tight">Trade</div>
          <div
            className={`text-[15px] font-medium tabular-nums leading-tight ${
              totalPnL >= 0 ? "text-sky-400" : "text-rose-400"
            }`}
          >
            {totalPnL >= 0 ? "" : "-"}
            {fmt(Math.abs(totalPnL))} USD
          </div>
        </div>

        {/* Wallet icon — only for real accounts, opens Traderiser wallet */}
        {isReal && (
          <button
            onClick={goToWallet}
            className="grid h-9 w-9 place-items-center text-white/85 active:opacity-70"
            aria-label="Wallet"
          >
            <CreditCard className="h-5 w-5" />
          </button>
        )}
        <button
          className="grid h-9 w-9 place-items-center text-white/85 active:opacity-70"
          aria-label="Sort"
        >
          <ArrowDownUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => router.push("/mt5/quotes")}
          className="grid h-9 w-9 place-items-center text-white/85 active:opacity-70"
          aria-label="New order"
        >
          <FilePlus2 className="h-5 w-5" />
        </button>
      </header>

      {/* ==== Account summary with dotted leaders (MT5 style) ==== */}
      <dl className="px-4 pt-3 pb-2 space-y-2 text-[15px]">
        <DottedRow k="Balance:" v={fmt(balance)} />
        <DottedRow k="Equity:" v={fmt(equity)} />
        {hasPositions && <DottedRow k="Margin:" v={fmt(margin)} />}
        <DottedRow k="Free margin:" v={fmt(freeMargin)} />
        {hasPositions && <DottedRow k="Margin Level (%):" v={fmt(marginLevel)} />}
      </dl>

      {/* ==== Positions bar ==== */}
      <div className="mt-2 flex items-center justify-between bg-[#101010] px-4 py-2 relative border-t border-b border-white/5">
        <div className="text-[14px] text-white/60">Positions</div>
        <button
          onClick={() => setShowHeaderMenu(!showHeaderMenu)}
          className="text-white/50 hover:text-white p-1"
          aria-label="Position actions"
        >
          <MoreHorizontal size={20} />
        </button>

        {showHeaderMenu && (
          <div className="absolute right-2 top-full mt-1 w-56 bg-[#1a1f2c] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
            <button
              onClick={closeAll}
              disabled={!hasPositions}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40"
            >
              Close All Positions
            </button>
            <button
              onClick={closeProfitable}
              disabled={!hasPositions}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40"
            >
              Close Profitable Positions
            </button>
            <button
              onClick={closeLosing}
              disabled={!hasPositions}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40"
            >
              Close Losing Positions
            </button>
          </div>
        )}
      </div>

      {/* ==== Position rows ==== */}
      <ul className="divide-y divide-white/5">
        {positions.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-white/40">No open positions</li>
        )}
        {positions.map((p: any) => {
          const liveProfit = calcProfit(p) || 0;
          const sideColor = p.side === "buy" ? "text-sky-400" : "text-rose-400";
          const digits = p.symbol?.includes("JPY") ? 3 : p.symbol?.startsWith("XAU") ? 2 : 5;
          return (
            <li
              key={p.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 active:bg-white/5"
            >
              <div>
                <div className="text-[15px]">
                  <span className="font-bold text-white">{p.symbol}</span>
                  <span className="text-white/70">, </span>
                  <span className={sideColor}>
                    {p.side} {p.volume.toFixed(2)}
                  </span>
                </div>
                <div className="text-[13px] text-white/60 tabular-nums mt-0.5">
                  {p.openPrice?.toFixed(digits)}{" "}
                  <span className="text-white/40">↗</span>{" "}
                  {p.currentPrice?.toFixed(digits)}
                </div>
              </div>
              <div
                className={`text-[20px] font-semibold tabular-nums ${
                  liveProfit >= 0 ? "text-sky-400" : "text-rose-400"
                }`}
              >
                {liveProfit >= 0 ? "" : "-"}
                {Math.abs(liveProfit).toFixed(2)}
              </div>
            </li>
          );
        })}
      </ul>

      <MT5Sidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        account={mt5Account}
        user={user}
      />
    </div>
  );
}

function DottedRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-white/90 shrink-0">{k}</dt>
      <span
        className="flex-1 border-b border-dotted border-white/25 translate-y-[-4px]"
        aria-hidden
      />
      <dd className="text-white tabular-nums shrink-0">{v}</dd>
    </div>
  );
}
