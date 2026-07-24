"use client";

import { useSyncExternalStore } from "react";
import { tickFeed } from "./ticks";
import type { RobotConfig, Transaction } from "./types";
import { api } from "@/lib/api";
import { updateRealBalance } from "@/lib/updateBalance";
import { recordBuy, recordSettlement } from "@/lib/positionsStore";
import { sfx } from "@/lib/sound";
import { toast } from "sonner";
import { isWinningDigit } from "@/lib/contracts";

// Safe local helpers
const getAccountType = (): "standard" | "demo" => {
  if (typeof window === "undefined") return "standard";
  const saved = localStorage.getItem("account_type");
  return saved === "demo" ? "demo" : "standard";
};

const getCurrentBalance = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem("user_session");
  if (!raw) return 0;

  try {
    const userData = JSON.parse(raw) as { accounts?: Array<Record<string, unknown>> };
    const activeId = localStorage.getItem("active_account_id");
    const accountType = getAccountType();

    let currentAcc = userData.accounts?.find((acc) => {
      const accData = acc as Record<string, unknown>;
      const accId = String(accData.id ?? "");
      const accType = String(accData.account_type ?? "");
      return accId === String(activeId) || accType === accountType;
    });

    if (!currentAcc && userData.accounts?.length) {
      currentAcc = userData.accounts[0];
    }

    const balance = (currentAcc as Record<string, unknown>)?.balance;
    return Number(balance) || 0;
  } catch (err) {
    console.error("Failed to get current balance in robotRunner:", err);
    return 0;
  }
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type State = {
  transactions: Transaction[];
  isRunning: boolean;
  config:
    | (RobotConfig & { marketId: number; robotId?: number; market?: string })
    | null;
  currentStake: number;
  martingaleLevel: number;
  sessionPnl: number;
  runs: number;
  finishedReason?:
    | "target"
    | "stoploss"
    | "maxruns"
    | "manual"
    | "insufficient"
    | "batch";
  /** Set when a bulk batch finishes so RunPanel can show a bulk-specific banner. */
  finishedRobotName?: string;
  /** Signed profit for the finished bulk batch (positive = win). */
  finishedProfit?: number;
  /** True when the last finished run was a bulk batch (vs. a normal robot run). */
  isBulkRun?: boolean;
};

const listeners = new Set<() => void>();
let state: State = {
  transactions: [],
  isRunning: false,
  config: null,
  currentStake: 0,
  martingaleLevel: 0,
  sessionPnl: 0,
  runs: 0,
};
let timer: ReturnType<typeof setTimeout> | null = null;

const emit = () => listeners.forEach((l) => l());
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

export function start(
  config: RobotConfig & { marketId: number; robotId?: number; market?: string },
) {
  if (state.isRunning) return;

  if (config.market) tickFeed.setMarket(config.market);
  tickFeed.start();

  setState({
    isRunning: true,
    config,
    currentStake: config.initialStake,
    martingaleLevel: 0,
    finishedReason: undefined,
    finishedRobotName: undefined,
    finishedProfit: undefined,
    isBulkRun: false,
  });

  placeOne();
}

export function stop() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  setState({ isRunning: false });
}

export function reset() {
  stop();
  setState({
    transactions: [],
    sessionPnl: 0,
    runs: 0,
    martingaleLevel: 0,
    currentStake: 0,
    finishedReason: undefined,
    finishedRobotName: undefined,
    finishedProfit: undefined,
    isBulkRun: false,
  });
}

function waitForNextTick(): Promise<number> {
  return new Promise((resolve) => {
    const unsub = tickFeed.subscribe((t: { lastDigit: number }) => {
      unsub();
      resolve(t.lastDigit);
    });
  });
}

// ==================== MAIN TRADE FUNCTION ====================
async function placeOne() {
  if (!state.isRunning || !state.config) return;

  const cfg = state.config;
  const stake = state.currentStake;

  // ====================== BALANCE CHECK ======================
  const currentBalance = getCurrentBalance();
  if (currentBalance < stake) {
    toast.error("Insufficient Balance", {
      description: `Required: $${stake.toFixed(2)} | Available: $${currentBalance.toFixed(2)}\n\nPlease recharge your account to continue.`,
      duration: 15000,
    });
    setState({ finishedReason: "insufficient" });
    stop();
    return;
  }
  // ===========================================================

  const openId = newId();
  const txId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const account_type = getAccountType();

  try {
    const basePayload = {
      market_id: cfg.marketId,
      digit_contract_type: cfg.contractKind as "over" | "under" | "matches" | "differs" | "even" | "odd",
      digit_barrier: ["over", "under", "matches", "differs"].includes(cfg.contractKind)
        ? cfg.barrier
        : undefined,
      amount: Number(stake),
      account_type,
    };

    let response;
    if (cfg.robotId !== undefined) {
      response = await api.placeSRobotTrade({
        ...basePayload,
        robot_id: cfg.robotId,
      });
    } else {
      response = await api.placeDigitTrade(basePayload);
    }

    // Safe response handling
    let result: unknown = null;
    if (response && typeof response === "object" && response !== null && "data" in response) {
      result = (response as { data: unknown }).data;
    } else {
      result = response;
    }

    // Safe trade extraction
    let trade: Record<string, unknown> | null = null;
    if (result && typeof result === "object" && result !== null) {
      const resObj = result as Record<string, unknown>;
      if (Array.isArray(resObj.trades) && resObj.trades.length > 0) {
        trade = resObj.trades[0] as Record<string, unknown>;
      } else if (resObj.trade && typeof resObj.trade === "object") {
        trade = resObj.trade as Record<string, unknown>;
      } else {
        trade = resObj;
      }
    }

    if (!trade) {
      throw new Error("Invalid trade response from server");
    }

    // Safe property access
    const realDigit = Number(
      (result && typeof result === "object" && "last_digit" in result)
        ? (result as Record<string, unknown>).last_digit
        : (trade as Record<string, unknown>).last_digit_outcome ??
          (trade as Record<string, unknown>).last_digit ??
          0
    );

    let isWin = (trade as Record<string, unknown>).is_win === true;
    if ((trade as Record<string, unknown>).is_win === undefined || (trade as Record<string, unknown>).is_win === null) {
      isWin = isWinningDigit(
        cfg.contractKind,
        ["over", "under", "matches", "differs"].includes(cfg.contractKind)
          ? cfg.barrier
          : undefined,
        realDigit,
      );
    }

    const profitFromResult = Number(
      (result && typeof result === "object" && "total_profit" in result)
        ? (result as Record<string, unknown>).total_profit
        : (trade as Record<string, unknown>).total_profit ??
          (trade as Record<string, unknown>).profit ??
          0
    );

    const profit = isWin ? Math.abs(profitFromResult) : -Number(stake);
    const payoutCredit = isWin ? Number(stake) + Math.abs(profitFromResult) : 0;

    const currentTick = tickFeed.getHistory().at(-1);
    const entrySpot = currentTick?.price ?? 9200;
    const entryDigit = currentTick?.lastDigit ?? 0;

    // Open Transaction
    const openTx: Transaction = {
      id: txId,
      contractKind: cfg.contractKind,
      barrier: cfg.barrier,
      market: cfg.market || "Volatility",
      entrySpot: Number(entrySpot.toFixed(2)),
      exitSpot: 0,
      buyPrice: stake,
      payout: 0,
      pnl: 0,
      isWin: false,
      runIndex: state.runs + 1,
      martingaleLevel: state.martingaleLevel,
      timestamp: Date.now(),
      isOpen: true,
    };

    setState({ transactions: [openTx, ...state.transactions] });

    const openPosition = {
      id: openId,
      refId: `robot-${Date.now()}`,
      contractKind: cfg.contractKind,
      barrier: cfg.barrier,
      stake: Number(stake),
      potentialPayout: payoutCredit,
      multiplier: 0,
      entrySpot: Number(entrySpot.toFixed(2)),
      entryDigit,
      marketId: cfg.marketId,
      marketName: cfg.market || "Volatility Market",
      accountType: account_type,
      createdAt: Date.now(),
      isAuto: true,
    };

    recordBuy({ open: openPosition, balanceAfter: 0 });
    sfx.buy();

    tickFeed.forceNextDigit(realDigit);

    const revealedDigit = await waitForNextTick();
    const exitTick = tickFeed.getHistory().at(-1);
    const exitSpot = exitTick?.price ?? entrySpot;

    recordSettlement({
      openId,
      exitSpot: Number(exitSpot.toFixed(2)),
      exitDigit: revealedDigit,
      outcome: isWin ? "W" : "L",
      payout: payoutCredit,
      profit,
      balanceAfter: updateRealBalance(profit),
    });

    if (isWin) sfx.win();
    else sfx.lose();

    const settledTx: Transaction = {
      ...openTx,
      exitSpot: Number(exitSpot.toFixed(2)),
      payout: payoutCredit,
      pnl: profit,
      isWin,
      exitDigit: revealedDigit,
      isOpen: false,
      timestamp: Date.now(),
    };

    const nextPnl = +(state.sessionPnl + profit).toFixed(2);
    const nextRuns = state.runs + 1;
    const nextLevel = isWin ? 0 : state.martingaleLevel + 1;

    const nextStake = +(
      cfg.initialStake * Math.pow(cfg.multiplier || 1, nextLevel)
    ).toFixed(2);

    setState({
      transactions: state.transactions.map((t) =>
        t.id === txId ? settledTx : t
      ),
      sessionPnl: nextPnl,
      runs: nextRuns,
      martingaleLevel: nextLevel,
      currentStake: nextStake,
    });

    // Stop conditions
    if (cfg.targetProfit > 0 && nextPnl >= cfg.targetProfit) {
      setState({ finishedReason: "target" });
      stop();
      toast.success(`🎉 ${cfg.market} reached Target Profit! +$${nextPnl.toFixed(2)}`, { duration: 15000 });
      return;
    }

    if (cfg.stopLoss > 0 && nextPnl <= -Math.abs(cfg.stopLoss)) {
      setState({ finishedReason: "stoploss" });
      stop();
      toast.error(`Maximum Stop Loss Reached: -$${Math.abs(nextPnl).toFixed(2)}`, { duration: 12000 });
      return;
    }

    if (cfg.maxRuns > 0 && nextRuns >= cfg.maxRuns) {
      setState({ finishedReason: "maxruns" });
      stop();
      toast.info(`Maximum runs (${cfg.maxRuns}) reached.`, { duration: 8000 });
      return;
    }

    const delay = getTradeDelay(cfg.market);
    timer = setTimeout(placeOne, delay);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Trade failed";
    console.error("Robot trade failed:", err);
    setState({
      transactions: state.transactions.filter((t) => t.id !== txId),
    });
    toast.error(errorMessage + ". Retrying in 1.5s...");
    timer = setTimeout(placeOne, 1500);
  }
}

function getTradeDelay(marketName?: string): number {
  if (!marketName) return 1200;
  const lower = marketName.toLowerCase();
  return lower.includes("1s") ? 850 : 2200;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot(): State {
  return state;
}

export function useRobotRunner() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* ================================================================== */
/*  BULK BATCH EXECUTION                                              */
/*                                                                    */
/*  All N trades in a bulk batch share:                               */
/*    • ONE entry tick  (same entrySpot + entryDigit for every leg)   */
/*    • ONE exit tick   (same exitSpot + exitDigit for every leg)     */
/*                                                                    */
/*  The server still decides each leg's win/loss and profit — but     */
/*  visually every position enters together and exits together, the   */
/*  way a real broker's bulk contract does.                           */
/*                                                                    */
/*  The finish banner in RunPanel is bulk-aware and reads             */
/*  finishedRobotName + finishedProfit to show:                       */
/*    win  → "{robot} has profited $X.XX successfully"                */
/*    loss → "{robot} has posted a loss of -$X.XX — try again ..."    */
/* ================================================================== */

export type BulkBatchConfig = {
  robotId: number;
  robotName?: string;
  marketId: number;
  marketName?: string;
  contractKind: "over" | "under" | "matches" | "differs" | "even" | "odd";
  barrier?: number;
  stake: number;
  numTrades: number;
};

export async function startBulkBatch(cfg: BulkBatchConfig): Promise<{
  wins: number;
  losses: number;
  totalProfit: number;
}> {
  if (state.isRunning) {
    toast.error("A robot run is already in progress");
    return { wins: 0, losses: 0, totalProfit: 0 };
  }

  const required = cfg.stake * cfg.numTrades;
  const balance = getCurrentBalance();
  if (balance < required) {
    toast.error("Insufficient Balance", {
      description: `Required: $${required.toFixed(2)} | Available: $${balance.toFixed(2)}`,
      duration: 10000,
    });
    return { wins: 0, losses: 0, totalProfit: 0 };
  }

  if (cfg.marketName) tickFeed.setMarket(cfg.marketName);
  tickFeed.start();

  const robotLabel = cfg.robotName || "Bulk Robot";

  setState({
    isRunning: true,
    config: {
      marketId: cfg.marketId,
      robotId: cfg.robotId,
      market: cfg.marketName,
      contractKind: cfg.contractKind,
      barrier: cfg.barrier,
      initialStake: cfg.stake,
      multiplier: 1,
      targetProfit: 0,
      stopLoss: 0,
      maxRuns: cfg.numTrades,
    } as RobotConfig & { marketId: number; robotId?: number; market?: string },
    currentStake: cfg.stake,
    martingaleLevel: 0,
    finishedReason: undefined,
    finishedRobotName: undefined,
    finishedProfit: undefined,
    isBulkRun: true,
  });

  const account_type = getAccountType();
  const usesBarrier = ["over", "under", "matches", "differs"].includes(cfg.contractKind);

  // -------------------------------------------------------------
  // 1) SHARED ENTRY TICK — snapshot ONE tick for every leg.
  // -------------------------------------------------------------
  const entryTickNow = tickFeed.getHistory().at(-1);
  const entrySpot = Number((entryTickNow?.price ?? 9200).toFixed(2));
  const entryDigit = entryTickNow?.lastDigit ?? 0;
  const batchTs = Date.now();

  // Build N open transactions with the SAME entry — Sashi-style batch open.
  const openTxs: Transaction[] = Array.from({ length: cfg.numTrades }, (_, idx) => ({
    id: `bulk-${batchTs}-${idx}`,
    contractKind: cfg.contractKind,
    barrier: cfg.barrier,
    market: cfg.marketName || "Volatility",
    entrySpot,
    exitSpot: 0,
    buyPrice: cfg.stake,
    payout: 0,
    pnl: 0,
    isWin: false,
    runIndex: idx + 1,
    martingaleLevel: 0,
    timestamp: batchTs,
    isOpen: true,
  }));

  // Record open positions in the store — one refId per leg but all share entry.
  const openIds: string[] = [];
  openTxs.forEach((tx, idx) => {
    const openId = newId();
    openIds.push(openId);
    recordBuy({
      open: {
        id: openId,
        refId: `bulk-${batchTs}-${idx}`,
        contractKind: cfg.contractKind,
        barrier: cfg.barrier,
        stake: Number(cfg.stake),
        potentialPayout: 0,
        multiplier: 0,
        entrySpot,
        entryDigit,
        marketId: cfg.marketId,
        marketName: cfg.marketName || "Volatility Market",
        accountType: account_type,
        createdAt: batchTs,
        isAuto: true,
      },
      balanceAfter: 0,
    });
  });

  setState({ transactions: [...openTxs, ...state.transactions] });
  sfx.buy();

  try {
    // ONE call to the real bulk endpoint
    const response = await api.placeBulkTrade({
      robot_id: cfg.robotId,
      market_id: cfg.marketId,
      digit_contract_type: cfg.contractKind,
      digit_barrier: usesBarrier ? cfg.barrier : undefined,
      amount: Number(cfg.stake),
      number_of_trades: cfg.numTrades,
      account_type,
    });

    if (response.error) throw new Error(response.error);

    const data = response.data as {
      trades?: Array<Record<string, unknown>>;
      last_digit?: number;
    } | null;
    const trades: Array<Record<string, unknown>> = Array.isArray(data?.trades)
      ? (data!.trades as Array<Record<string, unknown>>)
      : [];

    // -------------------------------------------------------------
    // 2) SHARED EXIT TICK — pick ONE digit for the whole batch.
    //    Server may return one `last_digit` (preferred) or one per leg;
    //    if it's per-leg we use the FIRST leg's digit as the shared exit,
    //    but each leg's is_win still comes straight from the server.
    // -------------------------------------------------------------
    const sharedExitDigit = Number(
      data?.last_digit ??
        trades[0]?.last_digit_outcome ??
        trades[0]?.last_digit ??
        entryDigit,
    );

    tickFeed.forceNextDigit(sharedExitDigit);
    await waitForNextTick();
    const exitTick = tickFeed.getHistory().at(-1);
    const exitSpot = Number((exitTick?.price ?? entrySpot).toFixed(2));

    // -------------------------------------------------------------
    // 3) Settle every leg with the SAME exit spot + exit digit.
    // -------------------------------------------------------------
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;

    const settledTxs: Transaction[] = openTxs.map((openTx, idx) => {
      const t = trades[idx] ?? {};
      const serverDigit = Number(
        t.last_digit_outcome ?? t.last_digit ?? sharedExitDigit,
      );
      // Prefer server's is_win; fall back to computing from the shared exit digit.
      let isWin = t.is_win === true;
      if (t.is_win === undefined || t.is_win === null) {
        isWin = isWinningDigit(
          cfg.contractKind,
          usesBarrier ? cfg.barrier : undefined,
          serverDigit,
        );
      }
      const rawProfit = Number(t.profit ?? t.total_profit ?? 0);
      const profit = isWin ? Math.abs(rawProfit) : -Number(cfg.stake);
      const payoutCredit = isWin ? Number(cfg.stake) + Math.abs(rawProfit) : 0;

      if (isWin) wins++;
      else losses++;
      totalProfit += profit;

      // Settle in the positions store — shared exit spot/digit.
      recordSettlement({
        openId: openIds[idx],
        exitSpot,
        exitDigit: sharedExitDigit,
        outcome: isWin ? "W" : "L",
        payout: payoutCredit,
        profit,
        balanceAfter: updateRealBalance(profit),
      });

      return {
        ...openTx,
        exitSpot,
        payout: payoutCredit,
        pnl: profit,
        isWin,
        exitDigit: sharedExitDigit,
        isOpen: false,
        timestamp: Date.now(),
      };
    });

    // Splice settled transactions into state.
    setState({
      transactions: state.transactions.map((tx) => {
        const replacement = settledTxs.find((s) => s.id === tx.id);
        return replacement ?? tx;
      }),
      sessionPnl: +totalProfit.toFixed(2),
      runs: settledTxs.length,
      isRunning: false,
      finishedReason: "batch",
      finishedRobotName: robotLabel,
      finishedProfit: +totalProfit.toFixed(2),
      isBulkRun: true,
    });

    if (totalProfit >= 0) {
      sfx.win();
      toast.success(
        `${robotLabel} has profited $${totalProfit.toFixed(2)} successfully 🎉`,
        { duration: 10000 },
      );
    } else {
      sfx.lose();
      toast.error(
        `${robotLabel} has posted a loss of -$${Math.abs(totalProfit).toFixed(2)} — try again next round`,
        { duration: 10000 },
      );
    }

    return { wins, losses, totalProfit };
  } catch (err: unknown) {
    console.error("Bulk batch failed:", err);
    // Roll back the open transactions we optimistically added.
    const openTxIds = new Set(openTxs.map((t) => t.id));
    setState({
      isRunning: false,
      transactions: state.transactions.filter((t) => !openTxIds.has(t.id)),
    });
    const message = err instanceof Error ? err.message : "Bulk trade failed";
    toast.error(message);
    return { wins: 0, losses: 0, totalProfit: 0 };
  }
}
