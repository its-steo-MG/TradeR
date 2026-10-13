"use client";

// Market-aware synthetic tick feed.
// - "1s" markets emit one tick every 1000 ms (Deriv-like).
// - All other Volatility markets emit one tick every 2000 ms.
// - Supports forceNextDigit(d) so a settled trade can pin the next last-digit.
// - Supports forcePriceMove("up" | "down") so Rise/Fall candles follow Sashi.

export type Tick = { time: number; price: number; lastDigit: number };

type Listener = (t: Tick) => void;

class TickFeed {
  private price = 9200 + Math.random() * 50;
  private listeners = new Set<Listener>();
  private timer: NodeJS.Timeout | null = null;
  private history: Tick[] = [];
  private intervalMs = 1000;
  private marketName = "volatility-10-1s";

  private forcedDigits: number[] = [];
  private forcedMoves: Array<"up" | "down"> = [];

  setMarket(name: string) {
    this.marketName = (name || "").toLowerCase();
    const next = this.marketName.includes("1s") ? 1000 : 2000;
    if (next !== this.intervalMs) {
      this.intervalMs = next;
      if (this.timer) {
        this.stop();
        this.start();
      }
    }
  }

  forceNextDigit(digit: number) {
    if (digit < 0 || digit > 9 || !Number.isFinite(digit)) return;
    this.forcedDigits.push(Math.floor(digit));
  }

  /** Force the next tick to close higher or lower so the candle follows the trade. */
  forcePriceMove(dir: "up" | "down") {
    this.forcedMoves.push(dir);
  }

  start() {
    if (this.timer) return;

    if (this.history.length === 0) {
      const now = Date.now();
      for (let i = 60; i >= 0; i--) {
        this.price += (Math.random() - 0.5) * 4;
        this.history.push({
          time: now - i * this.intervalMs,
          price: +this.price.toFixed(2),
          lastDigit: this.digitOf(this.price),
        });
      }
    }

    this.timer = setInterval(() => this.emit(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  getHistory() {
    return [...this.history];
  }

  private emit() {
    const drift = (9200 - this.price) * 0.002;
    this.price += drift + (Math.random() - 0.5) * 6;

    if (this.forcedMoves.length > 0) {
      const dir = this.forcedMoves.shift()!;
      // One small tick so the candle tip only nudges, not a big jump.
      const step = 1.2 + Math.random() * 1.4;
      this.price += dir === "up" ? step : -step;
    }

    let priceStr = this.price.toFixed(2);
    let lastDigit = this.digitOf(this.price);

    if (this.forcedDigits.length > 0) {
      const forced = this.forcedDigits.shift()!;
      const intPart = Math.floor(this.price * 10) / 10;
      const adjusted = +(intPart + forced / 100).toFixed(2);
      this.price = adjusted;
      priceStr = adjusted.toFixed(2);
      lastDigit = forced;
    }

    const t: Tick = {
      time: Date.now(),
      price: +priceStr,
      lastDigit,
    };

    this.history.push(t);
    if (this.history.length > 240) this.history.shift();
    this.listeners.forEach((l) => l(t));
  }

  private digitOf(p: number) {
    return Math.floor(p * 100) % 10;
  }
}

export const tickFeed = new TickFeed();
