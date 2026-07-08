"use client";

import { useEffect, useState } from "react";
import { SYMBOLS, mt5Store, tickCandles, saveSymbolPrices } from "@/lib/mt5-store";

/**
 * Per-symbol persistent drift state (module-scope, not React state).
 * This gives us a natural-looking bias: instead of hard-forcing every tick
 * up/down, we push a small drift into the price each tick which accumulates
 * over the life of a candle. The candle body then closes in the biased
 * direction the vast majority of the time, while individual ticks still
 * wiggle up/down like a real market.
 *
 * SASHI BIAS RULES (as requested):
 *   sashi = true  -> ~55% of the drift favors the user (they mostly win)
 *   sashi = false -> ~55% of the drift fights the user (they mostly lose)
 *   No open position on a symbol -> zero drift, purely random walk
 */
const drift: Record<string, number> = {};

export function useMT5Tick() {
  const [, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const positions = mt5Store.getPositions();
      const isSashi = mt5Store.isSashi;
      // Probability that any given tick pushes in the user's favor.
      // 0.55 => ~55% of candles will close in that direction organically.
      const favorChance = isSashi ? 0.55 : 0.45;

      // Net user exposure per symbol (positive = net long, negative = net short)
      const netBySymbol: Record<string, number> = {};
      for (const p of positions) {
        netBySymbol[p.symbol] =
          (netBySymbol[p.symbol] || 0) + (p.side === "buy" ? p.volume : -p.volume);
      }

      SYMBOLS.forEach((s) => {
        s.prev = s.price;

        const price = s.price;

        // ====================== PERCENT-BASED VOLATILITY ======================
        let volPct: number;
        if (price >= 10000) volPct = 0.0009;
        else if (price >= 1000) volPct = 0.0007;
        else if (price >= 100) volPct = 0.0006;
        else if (price >= 20) volPct = 0.0005;
        else if (price >= 2) volPct = 0.0004;
        else volPct = 0.00025 / Math.max(price, 0.0001);

        let baseVol: number;
        if (price < 2) {
          if (price > 10) baseVol = 0.0009;
          else baseVol = 0.00025;
        } else {
          baseVol = price * volPct;
        }

        // ====================== SASHI TICK BIAS ======================
        // Determine which way we should nudge this tick.
        const net = netBySymbol[s.symbol] || 0;
        let biasDir = 0; // 0 = no bias (no open trade on this symbol)
        if (net !== 0) {
          const userDir = net > 0 ? 1 : -1; // buy => want price up, sell => want price down
          const favorsUser = Math.random() < favorChance;
          // If sashi & favors => push in userDir (price moves in user's favor).
          // If non-sashi & "favors" (45% chance) => also user's favor, else against.
          biasDir = favorsUser ? userDir : -userDir;
        }

        // Small persistent drift so the trend looks natural rather than jumpy.
        // Drift target is a fraction of baseVol pushed in biasDir; we ease
        // toward it so movement stays smooth and realistic.
        const targetDrift = biasDir * baseVol * 0.35;
        const prevDrift = drift[s.symbol] || 0;
        const newDrift = prevDrift * 0.75 + targetDrift * 0.25;
        drift[s.symbol] = newDrift;

        const momentum = (s.price - s.prev) * 0.3;
        const randomChange = (Math.random() - 0.5) * baseVol;
        const spike =
          Math.random() < 0.012 ? (Math.random() - 0.5) * baseVol * 5 : 0;

        s.price = +(s.price + randomChange + momentum + spike + newDrift).toFixed(
          s.digits,
        );

        if (s.price > s.day.high) s.day.high = s.price;
        if (s.price < s.day.low) s.day.low = s.price;
      });

      const openPositions = mt5Store.getPositions();
      if (openPositions.length > 0) {
        mt5Store.setPositions(
          openPositions.map((p) => {
            const sym = SYMBOLS.find((x) => x.symbol === p.symbol);
            return sym ? { ...p, currentPrice: sym.price } : p;
          }),
        );
      }

      tickCandles();
      saveSymbolPrices();
      setT((t) => t + 1);
    }, 600);

    return () => clearInterval(id);
  }, []);
}

export function useMT5Sub() {
  const [, setT] = useState(0);
  useEffect(() => {
    const h = () => setT((t) => t + 1);
    window.addEventListener("mt5:update", h);
    return () => window.removeEventListener("mt5:update", h);
  }, []);
}
