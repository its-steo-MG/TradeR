"use client";

/**
 * S-Digit Analysis Engine
 * -----------------------
 * Pure functions over a stream of last-digits (0-9).
 *
 * It scores every digit contract family against the *actual payout table*
 * (lib/contracts.ts) so a signal is only produced when the empirical hit rate
 * beats the break-even rate the broker needs — i.e. a real edge, not just a
 * "hot digit".
 *
 * Edge = p_hit * payout - 1        (per 1 unit staked)
 */

import { getPayout, type ContractKind } from "@/lib/contracts";

export type Family = "evenodd" | "overunder" | "matchesdiffers";

export type Signal = {
  family: Family;
  kind: ContractKind;
  barrier?: number;
  label: string;
  /** empirical probability over the analysis window */
  hitRate: number;
  /** probability needed to break even at this payout */
  breakEven: number;
  /** expected value per 1 unit staked */
  edge: number;
  /** 0-100 blended confidence */
  confidence: number;
  /** human readable entry instruction */
  entry: string;
  /** supporting numbers shown in the UI */
  notes: string[];
};

export const WINDOWS = [50, 100, 200, 500, 1000] as const;

export function digitsFrom(ticks: { lastDigit: number }[], window: number): number[] {
  return ticks.slice(-window).map((t) => t.lastDigit);
}

export function counts(digits: number[]): number[] {
  const c = new Array(10).fill(0);
  digits.forEach((d) => c[d]++);
  return c;
}

export function percentages(digits: number[]): number[] {
  const total = digits.length || 1;
  return counts(digits).map((c) => +((c / total) * 100).toFixed(2));
}

/** Current run-length of the trailing pattern, e.g. E E E O -> 1 for "O". */
export function streak<T>(arr: T[], eq: (a: T, b: T) => boolean): number {
  if (arr.length === 0) return 0;
  const last = arr[arr.length - 1];
  let n = 1;
  for (let i = arr.length - 2; i >= 0; i--) {
    if (eq(arr[i], last)) n++;
    else break;
  }
  return n;
}

/** Wilson lower bound — punishes small samples so we don't chase noise. */
function wilsonLower(hits: number, n: number, z = 1.64): number {
  if (n === 0) return 0;
  const p = hits / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (centre - margin) / d);
}

function build(
  family: Family,
  kind: ContractKind,
  barrier: number | undefined,
  hits: number,
  n: number,
  label: string,
  entry: string,
  notes: string[],
): Signal {
  const payout = getPayout(kind, barrier);
  const hitRate = n ? hits / n : 0;
  const safe = wilsonLower(hits, n);
  const breakEven = 1 / payout;
  const edge = safe * payout - 1;
  // Confidence: edge scaled, capped, plus sample-size weight.
  const sample = Math.min(1, n / 200);
  const confidence = Math.max(0, Math.min(100, Math.round(edge * 220 * sample + 50 * (edge > 0 ? 1 : 0))));
  return {
    family,
    kind,
    barrier,
    label,
    hitRate,
    breakEven,
    edge,
    confidence,
    entry,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* EVEN / ODD                                                          */
/* ------------------------------------------------------------------ */
export function analyseEvenOdd(digits: number[]): Signal {
  const n = digits.length;
  const evens = digits.filter((d) => d % 2 === 0).length;
  const odds = n - evens;
  const eo = digits.map((d) => (d % 2 === 0 ? "E" : "O"));
  const run = streak(eo, (a, b) => a === b);
  const lastSym = eo[eo.length - 1] ?? "E";

  // Mean-reversion bias: after a long single-sided run the opposite side is
  // the classic entry; combine with the raw frequency skew.
  const favourEven = evens >= odds;
  const reversion = run >= 4 ? (lastSym === "E" ? "odd" : "even") : null;
  const kind: ContractKind = (reversion ?? (favourEven ? "even" : "odd")) as ContractKind;
  const hits = kind === "even" ? evens : odds;

  const notes = [
    `Even ${((evens / (n || 1)) * 100).toFixed(1)}% · Odd ${((odds / (n || 1)) * 100).toFixed(1)}%`,
    `Current run: ${run}× ${lastSym === "E" ? "EVEN" : "ODD"}`,
  ];

  const entry =
    reversion
      ? `Wait for the ${run}× ${lastSym === "E" ? "EVEN" : "ODD"} run to break — enter ${kind.toUpperCase()} on the very next tick.`
      : `Enter ${kind.toUpperCase()} immediately after 2 consecutive ${kind === "even" ? "ODD" : "EVEN"} ticks (${kind === "even" ? "O O" : "E E"}).`;

  return build(
    "evenodd",
    kind,
    undefined,
    hits,
    n,
    kind === "even" ? "EVEN" : "ODD",
    entry,
    notes,
  );
}

/* ------------------------------------------------------------------ */
/* OVER / UNDER                                                        */
/* ------------------------------------------------------------------ */
export function analyseOverUnder(digits: number[]): Signal {
  const n = digits.length;
  let best: Signal | null = null;

  for (let b = 0; b <= 9; b++) {
    const over = digits.filter((d) => d > b).length;
    const under = digits.filter((d) => d < b).length;

    const candidates: Array<[ContractKind, number]> = [
      ["over", over],
      ["under", under],
    ];

    for (const [kind, hits] of candidates) {
      if (kind === "over" && b >= 9) continue;
      if (kind === "under" && b <= 0) continue;
      const s = build(
        "overunder",
        kind,
        b,
        hits,
        n,
        `${kind === "over" ? "Over" : "Under"} ${b}`,
        "",
        [],
      );
      if (!best || s.edge > best.edge) best = s;
    }
  }

  const s = best!;
  const b = s.barrier ?? 0;
  const opposite = s.kind === "over" ? `≤ ${b}` : `≥ ${b}`;
  s.notes = [
    `${s.label} hit ${(s.hitRate * 100).toFixed(1)}% of last ${n} ticks`,
    `Break-even needed: ${(s.breakEven * 100).toFixed(1)}%`,
    `Payout ×${getPayout(s.kind, b).toFixed(3)}`,
  ];
  s.entry = `Enter ${s.label} after you see 2 ticks landing ${opposite} (the pull-back), then fire on the next tick.`;
  return s;
}

/* ------------------------------------------------------------------ */
/* MATCHES / DIFFERS                                                   */
/* ------------------------------------------------------------------ */
export function analyseMatchesDiffers(digits: number[]): Signal {
  const n = digits.length;
  const c = counts(digits);

  let hotIdx = 0;
  let coldIdx = 0;
  c.forEach((v, i) => {
    if (v > c[hotIdx]) hotIdx = i;
    if (v < c[coldIdx]) coldIdx = i;
  });

  const matchesSig = build(
    "matchesdiffers",
    "matches",
    hotIdx,
    c[hotIdx],
    n,
    `Matches ${hotIdx}`,
    "",
    [],
  );
  const differsSig = build(
    "matchesdiffers",
    "differs",
    coldIdx,
    n - c[coldIdx],
    n,
    `Differs ${coldIdx}`,
    "",
    [],
  );

  const s = matchesSig.edge >= differsSig.edge ? matchesSig : differsSig;
  const d = s.barrier ?? 0;

  // How many ticks since that digit last appeared (gap analysis).
  let gap = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] === d) break;
    gap++;
  }

  s.notes = [
    `Hot digit ${hotIdx} (${((c[hotIdx] / (n || 1)) * 100).toFixed(1)}%) · Cold digit ${coldIdx} (${((c[coldIdx] / (n || 1)) * 100).toFixed(1)}%)`,
    `Digit ${d} last seen ${gap} ticks ago`,
    `Break-even needed: ${(s.breakEven * 100).toFixed(1)}% · Payout ×${getPayout(s.kind, d).toFixed(2)}`,
  ];
  s.entry =
    s.kind === "matches"
      ? `Digit ${d} is the dominant digit. Enter MATCHES ${d} right after it prints twice within 5 ticks, and keep the martingale short (3 steps max).`
      : `Digit ${d} is the rarest digit. Enter DIFFERS ${d} immediately — exit the cycle as soon as ${d} prints.`;

  return s;
}

/* ------------------------------------------------------------------ */
/* MASTER STRATEGY PICKER                                              */
/* ------------------------------------------------------------------ */
export type AnalysisResult = {
  evenOdd: Signal;
  overUnder: Signal;
  matchesDiffers: Signal;
  /** highest-edge signal across all three families */
  best: Signal;
  /** true when the best signal is strong enough to trade */
  tradeable: boolean;
  window: number;
};

export const TRADEABLE_EDGE = 0.03; // 3% expected value
export const TRADEABLE_CONFIDENCE = 55;

export function analyseAll(digits: number[]): AnalysisResult {
  const evenOdd = analyseEvenOdd(digits);
  const overUnder = analyseOverUnder(digits);
  const matchesDiffers = analyseMatchesDiffers(digits);
  const best = [evenOdd, overUnder, matchesDiffers].reduce((a, b) =>
    b.edge > a.edge ? b : a,
  );
  return {
    evenOdd,
    overUnder,
    matchesDiffers,
    best,
    tradeable: best.edge >= TRADEABLE_EDGE && best.confidence >= TRADEABLE_CONFIDENCE,
    window: digits.length,
  };
}

export function signalKey(s: Signal): string {
  return `${s.kind}:${s.barrier ?? "-"}`;
}
