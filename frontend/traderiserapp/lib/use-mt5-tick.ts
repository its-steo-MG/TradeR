"use client";

import { useEffect, useState } from "react";
import { SYMBOLS, mt5Store, tickCandles, saveSymbolPrices } from "@/lib/mt5-store";

export function useMT5Tick() {
  const [, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      SYMBOLS.forEach((s) => {
        s.prev = s.price;

        const price = s.price;

        // ====================== PERCENT-BASED VOLATILITY ======================
        // Previous logic used an ABSOLUTE baseVol (e.g. 0.0035) which is
        // invisible on high-priced symbols like XAUUSD (~2000), USDJPY (~150)
        // or BTCUSD (~60000). We now scale volatility as a % of price so every
        // symbol moves visibly on the chart, ticks and buy/sell buttons.
        let volPct: number;
        if (price >= 10000) volPct = 0.0009;   // BTC etc.  ~0.09% per tick
        else if (price >= 1000) volPct = 0.0007; // Gold, indices
        else if (price >= 100) volPct = 0.0006;  // USDJPY, ETH, silver-ish
        else if (price >= 20) volPct = 0.0005;   // mid-priced
        else if (price >= 2) volPct = 0.0004;    // low
        else volPct = 0.00025 / Math.max(price, 0.0001); // FX majors: keep old feel

        // For sub-2 prices (FX pairs like EURUSD ~1.08) fall back to the
        // original absolute scale so their smooth behaviour is preserved.
        let baseVol: number;
        if (price < 2) {
          if (price > 10) baseVol = 0.0009;
          else baseVol = 0.00025;
        } else {
          baseVol = price * volPct;
        }

        const momentum = (s.price - s.prev) * 0.3;
        const randomChange = (Math.random() - 0.5) * baseVol;
        const spike = Math.random() < 0.012 ? (Math.random() - 0.5) * baseVol * 5 : 0;

        s.price = +(s.price + randomChange + momentum + spike).toFixed(s.digits);

        if (s.price > s.day.high) s.day.high = s.price;
        if (s.price < s.day.low) s.day.low = s.price;
      });

      const positions = mt5Store.getPositions();
      if (positions.length > 0) {
        mt5Store.setPositions(positions.map(p => {
          const sym = SYMBOLS.find(x => x.symbol === p.symbol);
          return sym ? { ...p, currentPrice: sym.price } : p;
        }));
      }

      tickCandles();
      saveSymbolPrices();
      setT(t => t + 1);
    }, 600);

    return () => clearInterval(id);
  }, []);
}

export function useMT5Sub() {
  const [, setT] = useState(0);
  useEffect(() => {
    const h = () => setT(t => t + 1);
    window.addEventListener("mt5:update", h);
    return () => window.removeEventListener("mt5:update", h);
  }, []);
}