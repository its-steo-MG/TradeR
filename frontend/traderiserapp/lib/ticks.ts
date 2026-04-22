"use client";

// Market-aware synthetic tick feed.
// - "1s" markets emit one tick every 1000 ms (Deriv-like).
// - All other Volatility markets emit one tick every 2000 ms.
// - Supports `forceNextDigit(d)` so a settled trade can pin the very next
//   tick's last-digit to whatever the backend returned (Sashi sync).

export type Tick = { time: number; price: number; lastDigit: number };

type Listener = (t: Tick) => void;

class TickFeed {
  private price = 9200 + Math.random() * 50;
  private listeners = new Set<Listener>();
  private timer: NodeJS.Timeout | null = null;   // ← Fixed: proper type instead of any
  private history: Tick[] = [];
  private intervalMs = 1000;
  private marketName = "volatility-10-1s";

  // Queue of last-digits to force on upcoming ticks (FIFO).
  private forcedDigits: number[] = [];

  /** Set the active market. Re-evaluates tick speed. */
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

  /** Force the *next* emitted tick to end with `digit` (0–9). */
  forceNextDigit(digit: number) {
    if (digit < 0 || digit > 9 || !Number.isFinite(digit)) return;
    this.forcedDigits.push(Math.floor(digit));
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
    // Natural drift
    const drift = (9200 - this.price) * 0.002;
    this.price += drift + (Math.random() - 0.5) * 6;
    let priceStr = this.price.toFixed(2);
    let lastDigit = this.digitOf(this.price);

    // If we have a forced digit queued, adjust the price's last digit
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