"use client";

import { useState } from "react";
import { toast } from "sonner";
import { openPosition } from "@/lib/mt5-store";
import { playOpenTradeSound } from "@/lib/mt5-sounds";

const SYMBOLS = [
  { symbol: "EURUSD", name: "Euro vs US Dollar" },
  { symbol: "GBPUSD", name: "Great Britain Pound vs US Dollar" },
  { symbol: "USDJPY", name: "US Dollar vs Japanese Yen" },
  { symbol: "AUDCAD", name: "Australian Dollar vs Canadian Dollar" },
  { symbol: "XAUUSD", name: "Gold vs US Dollar" },
];

interface OrderPanelProps {
  symbol: string;
  onSymbolChange: (s: string) => void;
  onOrderPlaced?: () => void;
}

export default function OrderPanel({ 
  symbol, 
  onSymbolChange,
  onOrderPlaced 
}: OrderPanelProps) {
  const [volume, setVolume] = useState(0.01);
  const [sl, setSl] = useState<number | "">("");
  const [tp, setTp] = useState<number | "">("");
  const [confirm, setConfirm] = useState<null | "buy" | "sell">(null);
  const [loading, setLoading] = useState(false);

  const sym = SYMBOLS.find((s) => s.symbol === symbol)!;

  const placeOrder = (side: "buy" | "sell") => {
    // Place locally only (fast)
    openPosition(symbol, side, volume);
    playOpenTradeSound();

    toast.success(`${side.toUpperCase()} position opened`);
    setConfirm(null);

    if (onOrderPlaced) onOrderPlaced();
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-[#0f172a] p-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-white/50">Symbol</label>
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/10 bg-[#0a1018] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        >
          {SYMBOLS.map((s) => (
            <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setConfirm("sell")}
          className="rounded-lg bg-rose-500/90 px-4 py-3 text-left transition hover:bg-rose-500"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/80">Sell</div>
          <div className="text-lg font-bold text-white tabular-nums">1.08535</div>
        </button>
        <button
          onClick={() => setConfirm("buy")}
          className="rounded-lg bg-sky-500/90 px-4 py-3 text-left transition hover:bg-sky-500"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/80">Buy</div>
          <div className="text-lg font-bold text-white tabular-nums">1.08542</div>
        </button>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-white/50">Volume (lots)</label>
        <div className="mt-1 flex items-center gap-2">
          <button onClick={() => setVolume((v) => Math.max(0.01, +(v - 0.01).toFixed(2)))} className="h-9 w-9 rounded-md border border-white/10 bg-white/5 text-white">−</button>
          <input type="number" step="0.01" min="0.01" value={volume} onChange={(e) => setVolume(Math.max(0.01, +e.target.value))} className="h-9 flex-1 rounded-md border border-white/10 bg-[#0a1018] px-3 text-center text-sm text-white outline-none focus:border-sky-500" />
          <button onClick={() => setVolume((v) => +(v + 0.01).toFixed(2))} className="h-9 w-9 rounded-md border border-white/10 bg-white/5 text-white">+</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/50">Stop Loss</label>
          <input type="number" step="0.00001" value={sl} onChange={(e) => setSl(e.target.value === "" ? "" : +e.target.value)} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0a1018] px-3 text-sm text-white outline-none focus:border-sky-500" placeholder="—" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/50">Take Profit</label>
          <input type="number" step="0.00001" value={tp} onChange={(e) => setTp(e.target.value === "" ? "" : +e.target.value)} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0a1018] px-3 text-sm text-white outline-none focus:border-sky-500" placeholder="—" />
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={() => setConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm {confirm.toUpperCase()} order</h3>
            <p className="mt-1 text-sm text-white/60">{volume.toFixed(2)} lots of {sym.symbol}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirm(null)} className="rounded-md border border-white/10 bg-white/5 py-2.5 text-sm text-white hover:bg-white/10">Cancel</button>
              <button onClick={() => placeOrder(confirm)} disabled={loading} className={`rounded-md py-2.5 text-sm font-semibold text-white ${confirm === "buy" ? "bg-sky-500" : "bg-rose-500"}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}