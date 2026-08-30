"use client";

/**
 * Digit analysis engine — scans EVERY volatility market for:
 *   - Even / Odd
 *   - Over / Under  (all barriers 0-8 / 1-9, not just 2 and 4)
 *   - Matches / Differs (all digits 0-9)
 *
 * Digits come from YOUR feed (@/lib/marketFeeds -> @/lib/ticks) and the edge is
 * scored against YOUR payout table (@/lib/contracts), so a signal only fires
 * when the empirical hit rate beats what the broker needs to break even.
 */

import { getPayout, contractLabel, isWinningDigit, type ContractKind } from "@/lib/contracts";

export type Family = "evenodd" | "overunder" | "matchdiff";

export type Signal = {
  family: Family;
  market: string;
  kind: ContractKind;
  barrier?: number | undefined;
  label: string; // "Over 3"
  hits: number;
  samples: number;
  observed: number; // observed hit rate
  expected: number; // theoretical hit rate
  lower: number; // Wilson lower bound
  breakeven: number; // 1 / payout
  edge: number; // lower * payout - 1  (expected value per unit staked)
  payout: number;
  score: number;
  streak: number; // consecutive trailing ticks that confirm the setup
};

/** Wilson score lower bound. Punishes small samples so we don't chase noise. */
export function wilsonLower(hits: number, n: number, z = 1.64) {
  if (n === 0) return 0;
  const p = hits / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (c - m) / d);
}

export function digitCounts(digits: number[]) {
  const c = new Array(10).fill(0) as number[];
  digits.forEach((d) => {
    c[d] = (c[d] ?? 0) + 1;
  });
  return c;
}

function trailing(digits: number[], test: (d: number) => boolean) {
  let n = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    if (test(digits[i] as number)) n++;
    else break;
  }
  return n;
}

function build(
  family: Family,
  market: string,
  kind: ContractKind,
  barrier: number | undefined,
  hits: number,
  samples: number,
  expected: number,
  digits: number[],
): Signal {
  const payout = getPayout(kind, barrier);
  const breakeven = 1 / payout;
  const lower = wilsonLower(hits, samples);
  const edge = lower * payout - 1; // expected value per 1 unit staked
  const observed = samples ? hits / samples : 0;
  const streak = trailing(digits, (d) => isWinningDigit(kind, barrier, d));
  const score = edge * 100 + Math.min(streak, 6) * 0.3;
  return {
    family,
    market,
    kind,
    barrier,
    label: contractLabel(kind, barrier),
    hits,
    samples,
    observed,
    expected,
    lower,
    breakeven,
    edge,
    payout,
    score,
    streak,
  };
}

export function analyseMarket(market: string, digits: number[], window = 200): Signal[] {
  const d = digits.slice(-window);
  const n = d.length;
  if (n < 40) return [];
  const counts = digitCounts(d);
  const out: Signal[] = [];
  const hitsOf = (kind: ContractKind, barrier?: number) =>
    d.filter((x) => isWinningDigit(kind, barrier, x)).length;

  // EVEN / ODD
  out.push(build("evenodd", market, "even", undefined, hitsOf("even"), n, 0.5, d));
  out.push(build("evenodd", market, "odd", undefined, hitsOf("odd"), n, 0.5, d));

  // OVER / UNDER — every barrier
  for (let b = 0; b <= 8; b++) {
    out.push(build("overunder", market, "over", b, hitsOf("over", b), n, (9 - b) / 10, d));
  }
  for (let b = 1; b <= 9; b++) {
    out.push(build("overunder", market, "under", b, hitsOf("under", b), n, b / 10, d));
  }

  // MATCHES / DIFFERS — every digit
  for (let k = 0; k <= 9; k++) {
    const c = counts[k] ?? 0;
    out.push(build("matchdiff", market, "matches", k, c, n, 0.1, d));
    out.push(build("matchdiff", market, "differs", k, n - c, n, 0.9, d));
  }

  return out;
}

export type ScanResult = {
  family: Family;
  best: Signal | null;
  ranked: Signal[]; // best signal per market, sorted
  perMarket: Record<string, Signal[]>;
};

export function scanAll(
  store: Record<string, number[]>,
  family: Family,
  window = 200,
): ScanResult {
  const perMarket: Record<string, Signal[]> = {};
  const ranked: Signal[] = [];

  Object.entries(store).forEach(([market, digits]) => {
    const sigs = analyseMarket(market, digits, window).filter((s) => s.family === family);
    if (!sigs.length) return;
    sigs.sort((a, b) => b.score - a.score);
    perMarket[market] = sigs;
    ranked.push(sigs[0] as Signal);
  });

  ranked.sort((a, b) => b.score - a.score);
  return { family, best: ranked[0] ?? null, ranked, perMarket };
}

export const isTradeable = (s: Signal | null) => !!s && s.edge > 0 && s.samples >= 60;

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function entryAdvice(s: Signal): string {
  switch (s.kind) {
    case "even":
      return "Wait for the strip to print an O (odd), then enter EVEN on the very next tick. Two losses in a row = stand down.";
    case "odd":
      return "Wait for the strip to print an E (even), then enter ODD on the very next tick. Two losses in a row = stand down.";
    case "over":
      return `Enter OVER ${s.barrier} right after a tick lands at or below ${s.barrier}. Skip if two overs already printed back to back.`;
    case "under":
      return `Enter UNDER ${s.barrier} right after a tick lands at or above ${s.barrier}. Skip after two consecutive unders.`;
    case "matches":
      return `Digit ${s.barrier} is over-printing here. Enter MATCHES ${s.barrier} on the next tick, max 3 attempts, then stop.`;
    case "differs":
      return `Digit ${s.barrier} is cold. Enter DIFFERS ${s.barrier} on the next tick and run it flat — no martingale.`;
    default:
      return "";
  }
}
