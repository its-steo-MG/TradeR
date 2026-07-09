"use client";

import { useEffect, useState } from "react";
import { SYMBOLS, mt5Store, tickCandles, saveSymbolPrices } from "@/lib/mt5-store";

/**
 * Natural, slow MT5-style price movement.
 *
 * Each tick is a small random walk (up OR down at random) with a tiny
 * persistent drift that biases the OVERALL trend toward the user's
 * favor (sashi=true) or against them (sashi=false). Individual ticks
 * remain visually random — the bias only nudges the long-term direction.
 *
 * SASHI:
 *   sashi = true  -> ~51% of drift favors the user
 *   sashi = false -> ~51% of drift fights the user
 *   No open position -> zero drift, pure random walk
 */
const drift: Record<string, number> = {};

export function useMT5Tick() {
  const [, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const positions = mt5Store.getPositions();
      const isSashi = mt5Store.isSashi;
      const favorChance = isSashi ? 0.51 : 0.49;

      const netBySymbol: Record<string, number> = {};
      for (const p of positions) {
        netBySymbol[p.symbol] =
          (netBySymbol[p.symbol] || 0) + (p.side === "buy" ? p.volume : -p.volume);
      }

      SYMBOLS.forEach((s) => {
        s.prev = s.price;
        const price = s.price;

        // ============ SMALLER, MORE REALISTIC VOLATILITY ============
        // ~3x smaller than before so candles are short and natural.
        let volPct: number;
        if (price >= 10000) volPct = 0.00028;
        else if (price >= 1000) volPct = 0.00022;
        else if (price >= 100) volPct = 0.00018;
        else if (price >= 20) volPct = 0.00016;
        else if (price >= 2) volPct = 0.00013;
        else volPct = 0.00008 / Math.max(price, 0.0001);

        let baseVol: number;
        if (price < 2) {
          baseVol = price > 10 ? 0.0003 : 0.00008;
        } else {
          baseVol = price * volPct;
        }

        // ============ SASHI DRIFT (tiny, cumulative) ============
        const net = netBySymbol[s.symbol] || 0;
        let biasDir = 0;
        if (net !== 0) {
          const userDir = net > 0 ? 1 : -1;
          const favorsUser = Math.random() < favorChance;
          biasDir = favorsUser ? userDir : -userDir;
        }

        // Very small drift target so ticks look purely random visually.
        const targetDrift = biasDir * baseVol * 0.12;
        const prevDrift = drift[s.symbol] || 0;
        const newDrift = prevDrift * 0.85 + targetDrift * 0.15;
        drift[s.symbol] = newDrift;

        // Random walk — symmetric, no momentum accumulation.
        const randomChange = (Math.random() - 0.5) * baseVol * 1.2;
        // Rare, mild spike (not huge)
        const spike =
          Math.random() < 0.005 ? (Math.random() - 0.5) * baseVol * 2.2 : 0;

        s.price = +(s.price + randomChange + spike + newDrift).toFixed(s.digits);

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
    }, 1000); // slower — 1s per tick for realistic pacing

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
