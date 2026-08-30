"use client";

/**
 * Bridge between the Analysis Tool and YOUR robot (Sashi) implementation.
 *
 * IMPORTANT: this file no longer imports any robot module of its own.
 * It only builds a config object in the shape your RobotConfigPanel already
 * uses and hands it back to you, so the Sashi flow (backend trade + settled
 * digit -> tickFeed.forceNextDigit) stays exactly as you built it.
 */

import type { Signal } from "@/lib/analysisEngine";

export type MarketOption = { id: number; name: string; display_name?: string };

/** Same shape your RobotConfigPanel produces when it minimises into the dock. */
export type SignalRobotConfig = {
  robotId?: number;
  robotName?: string;
  marketId: number;
  market: string;
  marketLabel: string;
  contractKind: Signal["kind"];
  barrier?: number;
  initialStake: number;
  multiplier: number;
  maxRuns: number;
  targetProfit: number;
  stopLoss: number;
};

export type RobotPrefs = {
  robotId?: number;
  robotName?: string;
  multiplier: number;
  maxRuns: number;
  initialStake: number;
  targetProfit: number;
  stopLoss: number;
};

const KEY = "sdigit.robotPrefs";

const DEFAULTS: RobotPrefs = {
  multiplier: 2,
  maxRuns: 50,
  initialStake: 1,
  targetProfit: 10,
  stopLoss: 20,
};

export function loadPrefs(): RobotPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<RobotPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p: Partial<RobotPrefs>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...p }));
  } catch {
    /* ignore */
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Map a scanner market id ("volatility-25-1s") to your backend market row. */
export function findMarket(
  marketId: string,
  markets: MarketOption[],
): MarketOption | undefined {
  const target = norm(marketId);
  return (
    markets.find((m) => norm(m.name) === target) ??
    markets.find((m) => norm(m.display_name ?? "") === target) ??
    markets.find((m) => norm(m.name).includes(target) || target.includes(norm(m.name)))
  );
}

export type BuildConfigInput = {
  signal: Signal;
  markets: MarketOption[];
  stake: number;
  targetProfit: number;
  stopLoss: number;
  robotId?: number;
  robotName?: string;
};

/**
 * Builds (and remembers) the robot configuration from the signal + the three
 * numbers the user typed. Arming/running is done by YOUR code.
 */
export function buildConfigFromSignal(input: BuildConfigInput): SignalRobotConfig | null {
  const { signal, markets, stake, targetProfit, stopLoss } = input;
  const prefs = loadPrefs();
  const robotId = input.robotId ?? prefs.robotId;
  if (!robotId) return null;

  const market = findMarket(signal.market, markets);

  const cfg: SignalRobotConfig = {
    robotId,
    ...(input.robotName ?? prefs.robotName
      ? { robotName: input.robotName ?? prefs.robotName }
      : {}),
    marketId: market?.id ?? 0,
    market: market?.name ?? signal.market,
    marketLabel: market?.display_name ?? market?.name ?? signal.market,
    contractKind: signal.kind,
    ...(typeof signal.barrier === "number" ? { barrier: signal.barrier } : {}),
    initialStake: stake,
    multiplier: prefs.multiplier,
    maxRuns: prefs.maxRuns,
    targetProfit,
    stopLoss,
  };

  savePrefs({
    robotId,
    ...(input.robotName ? { robotName: input.robotName } : {}),
    initialStake: stake,
    targetProfit,
    stopLoss,
  });

  return cfg;
}
