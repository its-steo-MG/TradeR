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
import type { DigitContractKind } from "@/lib/types/positions";

// Safe local helpers
const getAccountType = (): "standard" | "demo" => {
  if (typeof window === "undefined") return "standard";
  const saved = localStorage.getItem("account_type");
  return saved === "demo" ? "demo" : "standard";
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
  finishedReason?: "target" | "stoploss" | "maxruns" | "manual";
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
  const openId = newId();
  const txId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const account_type = getAccountType();

  try {
    // Base payload with correct literal types
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
        : trade.last_digit_outcome ??
          trade.last_digit ??
          0,
    );

    let isWin = trade.is_win === true;
    if (trade.is_win === undefined || trade.is_win === null) {
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
        : trade.total_profit ??
          trade.profit ??
          0,
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
      toast.success(`🎉 ${cfg.market} reached Target Profit! +$${nextPnl.toFixed(2)}`, {
        duration: 15000,
      });
      return;
    }

    if (cfg.stopLoss > 0 && nextPnl <= -Math.abs(cfg.stopLoss)) {
      setState({ finishedReason: "stoploss" });
      stop();
      toast.error(`Maximum Stop Loss Reached: -$${Math.abs(nextPnl).toFixed(2)}`, {
        duration: 12000,
      });
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