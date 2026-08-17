"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { tickFeed, type Tick } from "@/lib/ticks";
import { digitStats } from "@/lib/digitStats";
import { sfx, setMuted as setSfxMuted } from "@/lib/sound";
import { getPayout, isWinningDigit } from "@/lib/contracts";

import TopBar from "@/components/trading/TopBar";
import ModeTabs, { type TradeMode } from "@/components/trading/ModeTabs";
import BulkScannerTab from "@/components/trading/BulkScannerTab";
import PriceChart from "@/components/trading/PriceChart";
import DigitStrip from "@/components/trading/DigitStrip";
import StakePanel from "@/components/trading/StakePanel";
import HistoryStrip from "@/components/trading/HistoryStrip";
import DigitPicker from "@/components/trading/DigitPicker";
import TradeButtons from "@/components/trading/TradeButtons";
import BottomNav from "@/components/trading/BottomNav";
import PositionsPanel from "@/components/trading/positions/PositionPanel";
import WinLossBurst from "@/components/trading/WinLossBurst";
import AIScannerFAB from "@/components/trading/AIScannerFAB";

/* ---- NEW terminal pieces ---- */
import TerminalTabs, { type TerminalTab } from "@/components/trading/TerminalTabs";
import ManualTrader from "@/components/trading/ManualTrader";
import RobotDock from "@/components/trading/RobotDock";

import { RobotConfigForm } from "@/components/trading/RobotConfigPanel";
import { useRobotRunner } from "@/lib/robotRunner";

import type { Account } from "@/types/account";
import { api } from "@/lib/api";

import {
  getOpen,
  getClosed,
  getStatement,
  recordBuy,
  recordSettlement,
  removeOpen,
  newId,
  newRefId,
  addStatement,
  getAccountType,
} from "@/lib/positionsStore";

import { updateRealBalance } from "@/lib/updateBalance";

import type {
  OpenPosition,
  ClosedPosition,
  StatementEntry,
  DigitContractKind,
} from "@/lib/types/positions";

// ==================== TYPES ====================
interface DigitTradeData {
  is_win?: boolean;
  total_profit?: number | string;
  profit?: number | string;
  last_digit?: number;
  last_digit_outcome?: number;
}
interface TradeResponse {
  data?: { trades?: DigitTradeData[]; trade?: DigitTradeData } | DigitTradeData;
  trades?: DigitTradeData[];
  trade?: DigitTradeData;
  last_digit?: number;
  total_profit?: number | string;
  profit?: number | string;
  is_win?: boolean;
}
type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};

const getCurrentBalance = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem("user_session");
  if (!raw) return 0;
  try {
    const userData = JSON.parse(raw) as { accounts?: Account[] };
    const activeId = localStorage.getItem("active_account_id");
    const accountType = getAccountType();
    let currentAcc = userData.accounts?.find(
      (acc) => String(acc.id) === String(activeId) || acc.account_type === accountType
    );
    if (!currentAcc && userData.accounts?.length) currentAcc = userData.accounts[0];
    return Number(currentAcc?.balance) || 0;
  } catch {
    return 0;
  }
};

export default function TradingPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [marketsLoaded, setMarketsLoaded] = useState(false);

  const [ticks, setTicks] = useState<Tick[]>([]);
  const [current, setCurrent] = useState<Tick | null>(null);
  const [mode, setMode] = useState<TradeMode>("overunder");
  const [stake, setStake] = useState(10);
  const [barrier, setBarrier] = useState(5);
  const [showBulkScanner, setShowBulkScanner] = useState(false);

  /* NEW: which workspace tab is active */
  const [terminalTab, setTerminalTab] = useState<TerminalTab>("dtrader");

  const [balance, setBalance] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const [history, setHistory] = useState<("T" | "W" | "L")[]>([]);
  const [netPnl, setNetPnl] = useState(0);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<"trade" | "positions">("trade");

  const [isTrading, setIsTrading] = useState(false);
  const [highlightDigit, setHighlightDigit] = useState<{
    digit: number;
    color: "green" | "red";
  } | null>(null);
  const [displayedLastDigit, setDisplayedLastDigit] = useState<number | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const burstCounter = useRef(0);
  const [burst, setBurst] = useState<
    { kind: "win" | "loss"; id: number; digit?: number | null } | null
  >(null);

  /* NEW: settlement flash for the manual-trader circles */
  const [lastResult, setLastResult] = useState<{
    digit: number;
    isWin: boolean;
    id: string;
  } | null>(null);

  const [statsWindow, setStatsWindow] = useState<number>(100);
  const [showRobotPanel, setShowRobotPanel] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(false);

  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [statement, setStatement] = useState<StatementEntry[]>([]);

  const { isRunning: isRobotRunning, transactions: robotTransactions = [] } = useRobotRunner();

  /* ------------------------------------------------------------------
   * Robot / bulk executions must paint the SAME win-loss badge on the
   * chart (DTrader) and on the digit circles (Manual Trader) that a
   * manual trade paints. We watch the runner ledger and fire a burst for
   * every transaction that flips from open -> settled.
   * ------------------------------------------------------------------ */
  const seenRobotTxRef = useRef<Set<string>>(new Set());
  const robotBootRef = useRef(false);

  useEffect(() => {
    const settled = robotTransactions.filter((t) => !t.isOpen);

    // First render after mount: adopt existing history without replaying it.
    if (!robotBootRef.current) {
      robotBootRef.current = true;
      settled.forEach((t) => seenRobotTxRef.current.add(String(t.id)));
      return;
    }

    const fresh = settled
      .filter((t) => !seenRobotTxRef.current.has(String(t.id)))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    if (fresh.length === 0) return;
    fresh.forEach((t) => seenRobotTxRef.current.add(String(t.id)));

    const last = fresh[fresh.length - 1];
    const isWin = Boolean(last.isWin);
    const digit =
      typeof last.exitDigit === "number"
        ? last.exitDigit
        : tickFeed.getHistory().at(-1)?.lastDigit ?? null;

    if (digit !== null) {
      setDisplayedLastDigit(digit);
      setHighlightDigit({ digit, color: isWin ? "green" : "red" });
      setTimeout(() => setHighlightDigit(null), 2500);
    }

    burstCounter.current += 1;
    setBurst({ kind: isWin ? "win" : "loss", id: burstCounter.current, digit });
    setLastResult({
      digit: digit ?? 0,
      isWin,
      id: `robot-${last.id}-${burstCounter.current}`,
    });

    const pnl = fresh.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    setNetPnl((p) => +(p + pnl).toFixed(2));
    setHistory((h) => [...h, ...fresh.map((t) => (t.isWin ? "W" : "L") as "W" | "L")].slice(-50));
  }, [robotTransactions]);

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id === selectedMarketId) || null,
    [markets, selectedMarketId]
  );

  useEffect(() => {
    const saved = localStorage.getItem("selected_market_id");
    if (saved) setSelectedMarketId(Number(saved));
  }, []);

  useEffect(() => {
    if (selectedMarketId !== null) {
      localStorage.setItem("selected_market_id", selectedMarketId.toString());
    }
  }, [selectedMarketId]);

  useEffect(() => {
    const fetchMarkets = async () => {
      const token = getToken();
      let marketList: Market[] = [];
      if (!token) {
        marketList = [
          { id: 1, name: "volatility-10-1s", display_name: "Volatility 10 (1s) Index" },
          { id: 2, name: "volatility-25-1s", display_name: "Volatility 25 (1s) Index" },
          { id: 3, name: "volatility-50-1s", display_name: "Volatility 50 (1s) Index" },
          { id: 4, name: "volatility-100-1s", display_name: "Volatility 100 (1s) Index" },
        ];
      } else {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const response = await fetch(`${baseURL}/trading/markets/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to fetch markets");
          const rawData: unknown = await response.json();
          if (Array.isArray(rawData)) {
            const volatilityMarkets: Market[] = rawData
              .filter((item) => {
                const m = item as Record<string, unknown>;
                const marketType = (m.market_type as Record<string, unknown>)?.name || m.name;
                return String(marketType || "").toLowerCase().includes("volatility");
              })
              .map((item): Market => {
                const m = item as Record<string, unknown>;
                const name = String(m.name || "");
                return {
                  id: Number(m.id) || 0,
                  name,
                  display_name:
                    m.display_name && typeof m.display_name === "string"
                      ? m.display_name
                      : name
                          .replace(/-/g, " ")
                          .replace(/\bvolatility\b/i, "Volatility")
                          .replace(/\b(\d+)\s*1s\b/i, "$1 (1s)")
                          .replace(/\bindex\b/i, "")
                          .trim() + " Index",
                  market_type: m.market_type as { name: string } | undefined,
                };
              });
            marketList =
              volatilityMarkets.length > 0
                ? volatilityMarkets
                : rawData.map((item): Market => {
                    const m = item as Record<string, unknown>;
                    return {
                      id: Number(m.id) || 0,
                      name: String(m.name || ""),
                      display_name:
                        typeof m.display_name === "string" ? m.display_name : undefined,
                      market_type: m.market_type as { name: string } | undefined,
                    };
                  });
          }
        } catch (err) {
          console.error("Failed to fetch markets:", err);
          marketList = [
            { id: 1, name: "volatility-10-1s", display_name: "Volatility 10 (1s) Index" },
            { id: 4, name: "volatility-100-1s", display_name: "Volatility 100 (1s) Index" },
          ];
        }
      }
      setMarkets(marketList);
      setMarketsLoaded(true);
      const savedId = localStorage.getItem("selected_market_id");
      const savedMarket = savedId ? marketList.find((m) => m.id === Number(savedId)) : null;
      if (savedMarket) setSelectedMarketId(savedMarket.id);
      else if (marketList.length > 0) setSelectedMarketId(marketList[0].id);
    };
    fetchMarkets();
  }, []);

  // === Switch market: show refresh UI on chart + digits, then rehydrate ===
  useEffect(() => {
    if (!selectedMarket) return;
    const name = selectedMarket.name || selectedMarket.display_name || "volatility-10-1s";

    setIsRefreshing(true);
    setTicks([]);
    setCurrent(null);
    setDisplayedLastDigit(null);
    setHighlightDigit(null);
    setBurst(null);

    tickFeed.setMarket(name);

    let cancelled = false;
    let attempts = 0;
    const minRefreshUntil = Date.now() + 700;

    const finish = (hist: Tick[]) => {
      if (cancelled) return;
      setTicks(hist);
      const last = hist[hist.length - 1];
      setCurrent(last);
      setDisplayedLastDigit(last.lastDigit);
      const wait = Math.max(0, minRefreshUntil - Date.now());
      setTimeout(() => {
        if (!cancelled) setIsRefreshing(false);
      }, wait);
    };

    const hydrate = () => {
      if (cancelled) return;
      const hist = tickFeed.getHistory();
      if (hist.length >= 2) {
        finish(hist);
        return;
      }
      attempts += 1;
      if (attempts < 30) setTimeout(hydrate, 100);
      else if (!cancelled) setIsRefreshing(false);
    };
    hydrate();

    return () => {
      cancelled = true;
    };
  }, [selectedMarket]);

  const reloadPositions = useCallback(() => {
    setOpenPositions(getOpen());
    setClosedPositions(getClosed());
    setStatement(getStatement());
  }, []);

  useEffect(() => {
    reloadPositions();
    window.addEventListener("positions-updated", reloadPositions);
    return () => window.removeEventListener("positions-updated", reloadPositions);
  }, [reloadPositions]);

  const loadRealBalance = useCallback(() => {
    const raw = localStorage.getItem("user_session");
    if (!raw) return;
    try {
      const userData = JSON.parse(raw) as { accounts?: Account[] };
      const activeId = localStorage.getItem("active_account_id");
      const accountType = getAccountType();
      let currentAcc = userData.accounts?.find((acc) => String(acc.id) === String(activeId));
      if (!currentAcc)
        currentAcc = userData.accounts?.find((acc) => acc.account_type === accountType);
      if (!currentAcc && userData.accounts?.length) currentAcc = userData.accounts[0];
      if (currentAcc) {
        setBalance(Number(currentAcc.balance) || 0);
        setActiveAccount(currentAcc);
      }
    } catch (err) {
      console.error("Failed to load balance:", err);
    }
  }, []);

  useEffect(() => {
    loadRealBalance();
    window.addEventListener("session-updated", loadRealBalance);
    return () => window.removeEventListener("session-updated", loadRealBalance);
  }, [loadRealBalance]);

  useEffect(() => {
    tickFeed.start();
    setTicks(tickFeed.getHistory());
    const unsub = tickFeed.subscribe((t) => {
      setCurrent(t);
      setTicks((prev) => [...prev, t].slice(-1200));
      setDisplayedLastDigit(t.lastDigit);
    });
    return () => {
      unsub();
      tickFeed.stop();
    };
  }, []);

  const waitForNextTick = (): Promise<Tick> =>
    new Promise((resolve) => {
      const unsub = tickFeed.subscribe((t) => {
        unsub();
        resolve(t);
      });
    });

  const handlePlaceTrade = useCallback(
    async (kind: DigitContractKind) => {
      if (!marketsLoaded || !selectedMarketId) {
        alert("Please wait for markets to load and select a market.");
        return;
      }
      if (isRefreshing) {
        alert("Market is still loading, please wait…");
        return;
      }
      const currentBalance = getCurrentBalance();
      if (currentBalance < stake) {
        alert(
          `Insufficient Balance!\n\nRequired: $${stake}\nAvailable: $${currentBalance.toFixed(
            2
          )}\n\nPlease recharge your account to trade.`
        );
        return;
      }
      if (stake < 0.5) {
        alert("Minimum stake is $0.5");
        return;
      }
      if (isTrading) return;
      setIsTrading(true);

      const openId = newId();
      const refId = newRefId();
      const open: OpenPosition = {
        id: openId,
        refId,
        contractKind: kind,
        barrier: ["over", "under", "matches", "differs"].includes(kind) ? barrier : undefined,
        stake: Number(stake),
        potentialPayout: 0,
        multiplier: 0,
        entrySpot: current?.price ?? 0,
        entryDigit: current?.lastDigit ?? 0,
        marketId: selectedMarketId,
        marketName: selectedMarket?.display_name || selectedMarket?.name || "Market",
        accountType: getAccountType(),
        createdAt: Date.now(),
        isAuto: false,
      };

      recordBuy({ open, balanceAfter: balance - Number(stake) });
      sfx.buy();

      try {
        const payload = {
          market_id: selectedMarketId,
          digit_contract_type: kind,
          digit_barrier: ["over", "under", "matches", "differs"].includes(kind) ? barrier : undefined,
          amount: Number(stake),
          account_type: getAccountType() as "standard" | "demo",
        };
        const apiResponse = await api.placeDigitTrade(payload);
        const responseData = (apiResponse as TradeResponse)?.data ?? apiResponse;
        let trade: DigitTradeData | undefined;
        if (responseData && typeof responseData === "object" && responseData !== null) {
          const rd = responseData as Record<string, unknown>;
          if (Array.isArray(rd.trades) && rd.trades.length > 0) trade = rd.trades[0] as DigitTradeData;
          else if (rd.trade && typeof rd.trade === "object") trade = rd.trade as DigitTradeData;
          else trade = rd as DigitTradeData;
        }
        if (!trade) throw new Error("Invalid trade response from server");
        const rootData =
          responseData && typeof responseData === "object" && responseData !== null
            ? (responseData as Record<string, unknown>)
            : {};
        const realDigit = Number(
          rootData.last_digit ??
            trade.last_digit_outcome ??
            trade.last_digit ??
            current?.lastDigit ??
            0
        );
        let isWin = trade.is_win === true;
        if (trade.is_win === undefined || trade.is_win === null) {
          isWin = isWinningDigit(
            kind,
            ["over", "under", "matches", "differs"].includes(kind) ? barrier : undefined,
            realDigit
          );
        }
        const profitAbs = Math.abs(
          Number(rootData.total_profit ?? trade.total_profit ?? trade.profit ?? 0)
        );

        tickFeed.forceNextDigit(realDigit);
        const revealTick = await waitForNextTick();

        setDisplayedLastDigit(revealTick.lastDigit);
        setHighlightDigit({ digit: revealTick.lastDigit, color: isWin ? "green" : "red" });
        setTimeout(() => setHighlightDigit(null), 2500);

        burstCounter.current += 1;
        setBurst({
          kind: isWin ? "win" : "loss",
          id: burstCounter.current,
          digit: revealTick.lastDigit,
        });
        // flash the matching circle in Manual Trader
        setLastResult({
          digit: revealTick.lastDigit,
          isWin,
          id: `${burstCounter.current}`,
        });

        if (isWin) sfx.win();
        else sfx.lose();

        const profit = isWin ? profitAbs : -Number(stake);
        const payoutCredit = isWin ? Number(stake) + profitAbs : 0;
        recordSettlement({
          openId,
          exitSpot: revealTick.price,
          exitDigit: revealTick.lastDigit,
          outcome: isWin ? "W" : "L",
          payout: payoutCredit,
          profit,
          balanceAfter: updateRealBalance(profit),
        });
        setNetPnl((p) => +(p + profit).toFixed(2));
        setHistory((h) => [...h.slice(-49), isWin ? "W" : "L"]);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Trade failed";
        console.error("Trade error:", err);
        alert(errorMessage);
        sfx.lose();
        const removed = removeOpen(openId);
        if (removed) {
          addStatement({
            id: newId(),
            refId: removed.refId,
            action: "adjustment",
            description: "Trade failed · stake refunded",
            credit: removed.stake,
            debit: 0,
            balance: balance,
            timestamp: Date.now(),
            contractKind: removed.contractKind,
            barrier: removed.barrier,
            accountType: removed.accountType,
          });
        }
      } finally {
        setIsTrading(false);
      }
    },
    [
      marketsLoaded,
      selectedMarketId,
      stake,
      isTrading,
      isRefreshing,
      barrier,
      current,
      selectedMarket,
      balance,
    ]
  );

  const handleStopOpen = (id: string) => {
    const removed = removeOpen(id);
    if (removed) {
      const balAfter = updateRealBalance(removed.stake);
      addStatement({
        id: newId(),
        refId: removed.refId,
        action: "adjustment",
        description: "Position cancelled · stake refunded",
        credit: removed.stake,
        debit: 0,
        balance: balAfter,
        timestamp: Date.now(),
        contractKind: removed.contractKind,
        barrier: removed.barrier,
        accountType: removed.accountType,
      });
    }
  };

  const handleClearHistory = () => {
    localStorage.setItem("dgt_closed_positions", "[]");
    localStorage.setItem("dgt_statement", "[]");
    window.dispatchEvent(new Event("positions-updated"));
  };

  const onToggleMute = () => {
    const m = !muted;
    setMuted(m);
    setSfxMuted(m);
  };

  const stats = useMemo(() => digitStats(ticks, statsWindow), [ticks, statsWindow]);

  const tradeUI = useMemo(() => {
    if (mode === "evenodd") {
      return {
        left: { label: "Even", payout: stake * getPayout("even"), pct: 50, tone: "green" as const, onClick: () => handlePlaceTrade("even") },
        right: { label: "Odd", payout: stake * getPayout("odd"), pct: 50, tone: "red" as const, onClick: () => handlePlaceTrade("odd") },
      };
    }
    if (mode === "matches") {
      return {
        left: { label: `Matches ${barrier}`, payout: stake * getPayout("matches"), pct: 11.8, tone: "green" as const, onClick: () => handlePlaceTrade("matches") },
        right: { label: `Differs ${barrier}`, payout: stake * getPayout("differs"), pct: 89, tone: "red" as const, onClick: () => handlePlaceTrade("differs") },
      };
    }
    const overPayout = getPayout("over", barrier);
    const underPayout = getPayout("under", barrier);
    return {
      left: {
        label: `Over ${barrier}`,
        payout: stake * overPayout,
        pct: Math.round((1 / overPayout) * 100),
        tone: "green" as const,
        onClick: () => handlePlaceTrade("over"),
        disabled: barrier === 9,
      },
      right: {
        label: `Under ${barrier}`,
        payout: stake * underPayout,
        pct: Math.round((1 / underPayout) * 100),
        tone: "red" as const,
        onClick: () => handlePlaceTrade("under"),
        disabled: barrier === 0,
      },
    };
  }, [mode, stake, barrier, handlePlaceTrade]);

  /** Contract kind currently armed — used by the Manual Trader badge overlay. */
  const activeKind: DigitContractKind =
    mode === "evenodd" ? "even" : mode === "matches" ? "matches" : "over";

  const isManual = terminalTab === "manual";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopBar
        muted={muted}
        onToggleMute={onToggleMute}
        activeAccount={activeAccount}
        onOpenRobotPanel={() => setShowRobotPanel(true)}
      />

      {/* ---- Deriv-style workspace tabs ---- */}
      <TerminalTabs
        active={showBulkScanner ? "bulk" : terminalTab}
        onChange={(t) => {
          sfx.click();
          if (t === "bulk") {
            /* The Bulk Scanner tab IS the bulk robot: open the full modal
               (market picker + bot config + your own prediction). */
            setShowBulkScanner(true);
            return;
          }
          setShowBulkScanner(false);
          setTerminalTab(t);
        }}
        locked={["botbuilder", "dashboard", "analysis"]}
        badges={{ bulk: isRobotRunning ? "LIVE" : undefined }}
      />

      <div className="px-3 sm:px-5 lg:px-8 pt-2">
        <ModeTabs mode={mode} onChange={(m) => { sfx.click(); setMode(m); }} />
      </div>

      {/* Bulk scanner has no top button any more — it is driven by the
          "Bulk Scanner" workspace tab. Rendered headless (trigger hidden). */}
      <BulkScannerTab
        markets={markets}
        hideTrigger
        onBatchStarted={() => setDockExpanded(true)}
        open={showBulkScanner}
        onOpenChange={setShowBulkScanner}
      />

      <div className="flex-1 overflow-y-auto pb-32 lg:pb-24">
        <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] px-3 sm:px-5 lg:px-8 py-4 lg:py-6">
          {tab === "trade" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              <div className="lg:col-span-8 space-y-5">
                <div className="relative h-[19rem] sm:h-80 md:h-96 lg:h-[480px] xl:h-[560px] rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden">
                  <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 max-w-[calc(100%-1.25rem)]">
                    <div className="bg-slate-950/95 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl flex items-center gap-2 sm:gap-3 border border-slate-700 shadow-sm max-w-[calc(100vw-3.5rem)]">
                      <div className="text-blue-400 text-base sm:text-xl">📈</div>
                      <select
                        value={selectedMarketId ?? ""}
                        onChange={(e) => setSelectedMarketId(Number(e.target.value))}
                        disabled={!marketsLoaded}
                        className="bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer py-1 pr-5 sm:pr-8 min-w-0 max-w-[9rem] sm:max-w-none sm:min-w-[200px] md:min-w-[260px] truncate appearance-none disabled:opacity-50"
                      >
                        {markets.map((m) => (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-white py-2">
                            {m.display_name || m.name}
                          </option>
                        ))}
                      </select>
                      <div className="text-slate-400 pointer-events-none">▼</div>
                    </div>
                  </div>

                  {isManual ? (
                    /* ---- MANUAL TRADER: circles replace the chart ---- */
                    <ManualTrader
                      pct={stats.pct}
                      maxIdx={stats.maxIdx}
                      minIdx={stats.minIdx}
                      currentDigit={displayedLastDigit}
                      price={current?.price ?? null}
                      selected={mode === "evenodd" ? null : barrier}
                      kind={activeKind}
                      marketName={selectedMarket?.display_name || selectedMarket?.name}
                      windowSize={statsWindow}
                      lastResult={lastResult}
                      onSelect={(d) => {
                        sfx.click();
                        if (mode !== "evenodd") setBarrier(d);
                      }}
                    />
                  ) : (
                    <>
                      <PriceChart
                        ticks={ticks}
                        current={current}
                        marketId={selectedMarketId}
                        isRefreshing={isRefreshing}
                      />
                      <WinLossBurst trigger={burst} />
                    </>
                  )}
                </div>

                {!isManual && (
                  <DigitStrip
                    key={`strip-${selectedMarketId ?? "none"}`}
                    pct={stats.pct}
                    maxIdx={stats.maxIdx}
                    minIdx={stats.minIdx}
                    currentDigit={displayedLastDigit}
                    selected={mode === "overunder" || mode === "matches" ? barrier : null}
                    highlight={highlightDigit}
                    windowSize={statsWindow}
                    onWindowChange={setStatsWindow}
                    isRefreshing={isRefreshing}
                    onSelect={(d) => {
                      sfx.click();
                      if (mode !== "evenodd") setBarrier(d);
                    }}
                  />
                )}

                <div className="hidden lg:block">
                  <HistoryStrip history={history} netPnl={netPnl} />
                </div>
              </div>

              <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4 lg:self-start">
                <StakePanel stake={stake} setStake={setStake} />

                <div className="lg:hidden">
                  <HistoryStrip history={history} netPnl={netPnl} />
                </div>

                {!isManual && (mode === "overunder" || mode === "matches") && (
                  <DigitPicker
                    digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                    selected={barrier}
                    onSelect={(d) => {
                      sfx.click();
                      setBarrier(d);
                    }}
                  />
                )}

                <TradeButtons left={tradeUI.left} right={tradeUI.right} />

                {isTrading && (
                  <div className="text-center py-3 text-blue-400 font-medium">Placing trade...</div>
                )}
                {isRefreshing && !isTrading && (
                  <div className="text-center py-3 text-blue-400 text-sm">Loading market data…</div>
                )}
                {!marketsLoaded && (
                  <div className="text-center py-3 text-blue-400 text-sm">Loading markets...</div>
                )}
              </div>
            </div>
          ) : (
            <PositionsPanel
              open={openPositions}
              closed={closedPositions}
              statement={statement}
              onStopOpen={handleStopOpen}
              onClearHistory={handleClearHistory}
              currentSpot={current?.price ?? null}
              currentDigit={displayedLastDigit}
            />
          )}
        </div>
      </div>

      <AIScannerFAB
        markets={markets}
        onStarted={() => setDockExpanded(true)}
        hidden={showRobotPanel || showBulkScanner}
      />

      {/* ---- Minimisable robot console (chart stays visible when collapsed) ---- */}
      <RobotDock
        onConfigure={() => setShowRobotPanel(true)}
        hidden={showRobotPanel || showBulkScanner}
        defaultExpanded={dockExpanded}
      />

      <div className="lg:hidden">
        <BottomNav tab={tab} onChange={setTab} />
      </div>

      <div
        className="hidden lg:flex fixed bottom-24 right-6 z-40 bg-slate-900/95 backdrop-blur-md
                   border border-slate-700 rounded-2xl p-1.5 shadow-2xl
                   ring-1 ring-black/40"
      >
        <button
          onClick={() => setTab("trade")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "trade"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Trade
        </button>
        <button
          onClick={() => setTab("positions")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "positions"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Positions
        </button>
      </div>

      {/* Robot CONFIG modal only — the live run view now lives in RobotDock */}
      {showRobotPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden max-h-[95vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
              <h3 className="font-semibold text-xl">S-Digit Robot</h3>
              <button
                onClick={() => setShowRobotPanel(false)}
                className="text-slate-400 hover:text-white text-3xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <RobotConfigForm
                selectedMarketId={selectedMarketId}
                onRun={() => {
                  setShowRobotPanel(false);
                  setDockExpanded(true);
                }}
              />
              {(isRobotRunning || robotTransactions.length > 0) && (
                <p className="mt-4 text-center text-xs text-slate-400">
                  A session is live — minimise this window and use the robot dock at the
                  bottom to watch executions while the chart stays visible.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getToken = () => localStorage.getItem("access_token");
