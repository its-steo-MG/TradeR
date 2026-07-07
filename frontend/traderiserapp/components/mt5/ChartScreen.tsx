"use client";

import { useEffect, useState } from "react";
import {
  Crosshair,
  Sigma,
  Triangle,
  Clock,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SYMBOLS, bidAsk, mt5Store, openPosition, type Timeframe, calcProfit, addClosedTrade } from "@/lib/mt5-store";
import { useMT5Sub, useMT5Tick } from "@/lib/use-mt5-tick";
import CandleChart from "./CandleChart";
import TimeframeWheel from "./TimeframeWheel";
import { toast } from "sonner";
import { playOpenTradeSound, playCloseTradeSound } from "@/lib/mt5-sounds";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

export default function ChartScreen() {
  useMT5Sub();
  useMT5Tick();

  const symbol = mt5Store.getSelectedSymbol();
  const sym = SYMBOLS.find((s) => s.symbol === symbol) ?? SYMBOLS[0];

  const [volume, setVolume] = useState(0.01);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [tf, setTf] = useState<Timeframe>("M1");

  // Live positions state
  const [positions, setPositions] = useState(() => mt5Store.getPositions());

  // ====================== HYDRATION ======================
  const [bidAskValues, setBidAskValues] = useState({ bid: 0, ask: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const updatePrices = () => {
      const { bid, ask } = bidAsk(sym);
      setBidAskValues({ bid, ask });
    };

    updatePrices();
    const interval = setInterval(updatePrices, 400);
    return () => clearInterval(interval);
  }, [sym]);

  const { bid, ask } = bidAskValues;

  // Live refresh every 1.5 seconds
  const refreshPositions = () => {
    mt5Store.refreshPositions();
    setPositions(mt5Store.getPositions());
  };

  useEffect(() => {
    refreshPositions();
    const interval = setInterval(refreshPositions, 1500);
    return () => clearInterval(interval);
  }, []);

  // ====================== INITIALIZATION ======================
  useEffect(() => {
    const savedTf = mt5Store.getSelectedTf();
    setTf(savedTf);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await mt5Store.syncAccountFromBackend();
      await mt5Store.fetchSashiStatus();
      await mt5Store.fetchPositionsFromBackend();
      refreshPositions();
    };
    initialize();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => mt5Store.checkMarginCall(), 4000);
    return () => clearInterval(interval);
  }, []);

  // ====================== EVENT LISTENERS ======================
  useEffect(() => {
    const handleMarginWarning = (e: CustomEvent) => {
      if (e.detail?.message) toast.warning(e.detail.message, { duration: 5000 });
    };

    const handleStopOut = (e: CustomEvent) => {
      if (e.detail?.message) toast.error(e.detail.message, { duration: 7000 });
    };

    // ====================== EA BATCH CLOSE LISTENER ======================
    const handleEAClosed = (e: CustomEvent) => {
      console.log("🔄 EA batch closed → refreshing ChartScreen");
      refreshPositions();
    };

    window.addEventListener("mt5:margin-warning", handleMarginWarning as EventListener);
    window.addEventListener("mt5:stop-out", handleStopOut as EventListener);
    window.addEventListener("mt5:ea-closed", handleEAClosed as EventListener);

    return () => {
      window.removeEventListener("mt5:margin-warning", handleMarginWarning as EventListener);
      window.removeEventListener("mt5:stop-out", handleStopOut as EventListener);
      window.removeEventListener("mt5:ea-closed", handleEAClosed as EventListener);
    };
  }, []);

  const placeTrade = async (side: "buy" | "sell") => {
    const result = await openPosition(sym.symbol, side, volume);
    if (result) playOpenTradeSound();
    if (result === null) {
      const check = mt5Store.canOpenTrade(volume);
      toast.error(check.reason || "Cannot open trade");
      return;
    }
    toast.success(`${side.toUpperCase()} position opened`);
    refreshPositions();
  };

  const closePosition = async (id: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const position = positions.find((p) => p.id === id);
    if (!position) return;

    const finalProfit = calcProfit(position);

    try {
      // Use correct MT5 endpoint
      await fetch(`${API_BASE}/api/mt5/positions/close/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          position_id: id,
          close_price: position.currentPrice,
        }),
      });

      //await fetch(`${API_BASE}/api/forex/positions/credit-on-close/`, {
      //  method: "POST",
      //  headers: {
      //    "Content-Type": "application/json",
      //    Authorization: `Bearer ${token}`,
      //  },
      //  body: JSON.stringify({
      //    realized_profit: finalProfit,
      //    symbol: position.symbol,
      //    volume: position.volume,
      //    side: position.side,
      //  }),
      //});
    } catch (e) {
      console.warn("Backend close failed", e);
    }

    addClosedTrade({
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      volume: position.volume,
      openPrice: position.openPrice,
      currentPrice: position.currentPrice,
      closePrice: position.currentPrice,
      profit: finalProfit,
      closedAt: Date.now(),
      openedAt: position.openedAt,
      swap: position.swap || 0,
      commission: position.commission || 0,
    });

    mt5Store.updateAccountBalance(finalProfit);
    refreshPositions();

    playCloseTradeSound();
    toast.success(`Closed • P/L: ${finalProfit >= 0 ? "+" : ""}${finalProfit.toFixed(2)}`);
  };

  const setSelectedTf = (t: Timeframe) => {
    mt5Store.setSelectedTf(t);
    setTf(t);
  };

  const changeSymbol = (newSymbol: string) => {
    mt5Store.setSelectedSymbol(newSymbol);
    setSymbolOpen(false);
  };

  const handleVolumeChange = (newVolume: number | string) => {
    if (newVolume === "" || newVolume === ".") {
      setVolume(0.01);
      return;
    }
    const num = parseFloat(newVolume as string);
    if (isNaN(num)) return;
    setVolume(num);
  };

  const handleVolumeBlur = () => {
    const clamped = Math.max(0.01, Math.min(100, volume));
    setVolume(+clamped.toFixed(2));
  };

  const big = (p: number) => p.toFixed(sym.digits).slice(0, -1);
  const small = (p: number) => p.toFixed(sym.digits).slice(-1);

  if (!isClient) {
    return (
      <div className="flex h-[100dvh] flex-col bg-black items-center justify-center text-white/60">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-white/85">
        <button onClick={() => setWheelOpen(true)} className="text-lg font-semibold tracking-wide">
          {tf}
        </button>

        <div className="flex items-center gap-6">
          <Crosshair className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-lg italic font-serif">f</span>
          <Triangle className="h-5 w-5" strokeWidth={1.5} />
        </div>

        <div className="flex items-center gap-4">
          <Clock className="h-5 w-5 text-rose-500" strokeWidth={1.75} />
          <LayoutGrid className="h-5 w-5 text-rose-500" strokeWidth={1.75} />
        </div>
      </div>

      {/* SELL | Volume | BUY */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-[2px] px-2">
        <button
          onClick={() => placeTrade("sell")}
          className="rounded-sm bg-[#e63946] px-3 py-1.5 text-left active:brightness-110"
        >
          <div className="text-[10px] font-semibold tracking-[0.15em] text-white/95">SELL</div>
          <div className="leading-none text-white">
            <span className="text-sm">{big(bid)}</span>
            <span className="text-xl font-bold">{small(bid)}</span>
          </div>
        </button>

        <div className="flex items-center justify-center gap-3 bg-black px-4">
          <button onClick={() => setVolume(Math.max(0.01, volume - 0.01))} className="text-white/85 active:text-white">
            <ChevronDown className="h-4 w-4" />
          </button>

          <input
            type="number"
            step="0.01"
            value={volume}
            onChange={(e) => handleVolumeChange(e.target.value)}
            onBlur={handleVolumeBlur}
            className="min-w-[40px] w-[52px] text-center text-sm font-semibold text-white tabular-nums bg-transparent border-none outline-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button onClick={() => setVolume(Math.min(100, volume + 0.01))} className="text-white/85 active:text-white">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => placeTrade("buy")}
          className="rounded-sm bg-[#2f8fef] px-3 py-1.5 text-right active:brightness-110"
        >
          <div className="text-[10px] font-semibold tracking-[0.15em] text-white/95">BUY</div>
          <div className="leading-none text-white">
            <span className="text-sm">{big(ask)}</span>
            <span className="text-xl font-bold">{small(ask)}</span>
          </div>
        </button>
      </div>

      {/* Symbol + Timeframe */}
      <div className="relative px-3 pt-2 pb-1 text-[12px]">
        <button onClick={() => setSymbolOpen((o) => !o)} className="flex items-baseline gap-1 text-white">
          <span className="font-bold">{sym.symbol}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/70" />
          <span className="ml-1 text-white/60">{tf}</span>
        </button>
        <div className="text-[11px] text-white/50">{sym.name}</div>

        {symbolOpen && (
          <div className="absolute left-3 top-full z-30 mt-1 max-h-64 w-56 overflow-auto rounded-md border border-white/10 bg-[#111] shadow-xl">
            {SYMBOLS.map((s) => (
              <button
                key={s.symbol}
                onClick={() => changeSymbol(s.symbol)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-white/5 ${
                  s.symbol === symbol ? "text-sky-400" : "text-white/85"
                }`}
              >
                <span className="font-semibold">{s.symbol}</span>
                <span className="text-white/40 text-[11px] truncate ml-2">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="relative flex-1 min-h-0 px-1 pt-1 pb-1">
        <CandleChart
          symbol={sym.symbol}
          tf={tf}
          digits={sym.digits}
          positions={positions}
          onClosePosition={closePosition}
        />
      </div>

      {wheelOpen && (
        <TimeframeWheel 
          value={tf} 
          onChange={setSelectedTf} 
          onClose={() => setWheelOpen(false)} 
        />
      )}
    </div>
  );
}