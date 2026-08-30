"use client";

/**
 * Multi-market tick source built on YOUR feed (@/lib/ticks).
 *
 * - The market you are currently trading/charting is taken 1:1 from the shared
 *   `tickFeed` singleton, so the analysis tool sees exactly the same digits as
 *   your chart and digit strip.
 * - Every other volatility market gets its own local feed instance using the
 *   same tick model, so the scanner can rank ALL markets at once.
 *
 * No external broker socket is used.
 */

import { tickFeed, type Tick } from "@/lib/ticks";

export type MarketInfo = { id: string; label: string; short: string; intervalMs: number };

export const MARKETS: MarketInfo[] = [
  { id: "volatility-10", label: "Volatility 10 Index", short: "V10", intervalMs: 2000 },
  { id: "volatility-25", label: "Volatility 25 Index", short: "V25", intervalMs: 2000 },
  { id: "volatility-50", label: "Volatility 50 Index", short: "V50", intervalMs: 2000 },
  { id: "volatility-75", label: "Volatility 75 Index", short: "V75", intervalMs: 2000 },
  { id: "volatility-100", label: "Volatility 100 Index", short: "V100", intervalMs: 2000 },
  { id: "volatility-10-1s", label: "Volatility 10 (1s) Index", short: "V10 (1s)", intervalMs: 1000 },
  { id: "volatility-25-1s", label: "Volatility 25 (1s) Index", short: "V25 (1s)", intervalMs: 1000 },
  { id: "volatility-50-1s", label: "Volatility 50 (1s) Index", short: "V50 (1s)", intervalMs: 1000 },
  { id: "volatility-75-1s", label: "Volatility 75 (1s) Index", short: "V75 (1s)", intervalMs: 1000 },
  { id: "volatility-100-1s", label: "Volatility 100 (1s) Index", short: "V100 (1s)", intervalMs: 1000 },
];

export const MARKET_LABEL: Record<string, string> = Object.fromEntries(
  MARKETS.map((m) => [m.id, m.short]),
);

export const marketLabel = (id: string) => MARKET_LABEL[id] ?? id;

export type DigitStore = Record<string, number[]>; // market id -> digits, oldest -> newest

const MAX = 1000;

/** Same digit rule as your feed: 2nd decimal place. */
const digitOf = (price: number) => Math.floor(price * 100) % 10;

type Listener = (store: DigitStore) => void;

export type FeedOptions = {
  /** Market currently selected in the terminal — mirrored from `tickFeed`. */
  activeMarket?: string;
  /** How many ticks of seed history to synthesise per background market. */
  seed?: number;
};

export function createMarketFeeds(opts: FeedOptions = {}) {
  const active = opts.activeMarket ?? "volatility-10-1s";
  const seed = opts.seed ?? 300;

  const store: DigitStore = {};
  const listeners = new Set<Listener>();
  const timers: ReturnType<typeof setInterval>[] = [];
  const prices: Record<string, number> = {};

  const emit = () => listeners.forEach((l) => l(store));

  const push = (id: string, digit: number) => {
    const arr = store[id] ?? [];
    arr.push(digit);
    if (arr.length > MAX) arr.shift();
    store[id] = arr;
  };

  // ---- background markets: same drift model as your TickFeed ----
  const step = (id: string) => {
    const base = 9200;
    const cur = prices[id] ?? base + Math.random() * 50;
    const drift = (base - cur) * 0.002;
    const next = +(cur + drift + (Math.random() - 0.5) * 6).toFixed(2);
    prices[id] = next;
    push(id, digitOf(next));
  };

  MARKETS.forEach((m) => {
    store[m.id] = [];
    if (m.id === active) return;
    for (let i = 0; i < seed; i++) step(m.id);
  });

  // ---- active market: mirror YOUR live feed exactly ----
  store[active] = tickFeed
    .getHistory()
    .slice(-MAX)
    .map((t: Tick) => t.lastDigit);

  const offActive = tickFeed.subscribe((t: Tick) => {
    push(active, t.lastDigit);
    emit();
  });

  MARKETS.forEach((m) => {
    if (m.id === active) return;
    timers.push(
      setInterval(() => {
        step(m.id);
        emit();
      }, m.intervalMs),
    );
  });

  return {
    activeMarket: active,
    subscribe(l: Listener) {
      listeners.add(l);
      l(store);
      return () => listeners.delete(l);
    },
    getStore: () => store,
    destroy() {
      offActive();
      timers.forEach(clearInterval);
      timers.length = 0;
      listeners.clear();
    },
  };
}
