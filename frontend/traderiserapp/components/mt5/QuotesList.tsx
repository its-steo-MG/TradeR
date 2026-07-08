"use client";

import { useRouter } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { useMT5Sub } from "@/lib/use-mt5-tick";
import { mt5Store } from "@/lib/mt5-store";
import { useEffect, useState } from "react";
import MT5Sidebar from "./MT5Sidebar";

const SYMBOLS = [
  { symbol: "EURUSD", name: "Euro vs US Dollar", digits: 5 },
  { symbol: "GBPUSD", name: "Great Britain Pound vs US Dollar", digits: 5 },
  { symbol: "USDJPY", name: "US Dollar vs Japanese Yen", digits: 3 },
  { symbol: "AUDUSD", name: "Australian Dollar vs US Dollar", digits: 5 },
  { symbol: "USDCAD", name: "US Dollar vs Canadian Dollar", digits: 5 },
  { symbol: "USDCHF", name: "US Dollar vs Swiss Franc", digits: 5 },
  { symbol: "NZDUSD", name: "New Zealand Dollar vs US Dollar", digits: 5 },
  { symbol: "EURGBP", name: "Euro vs Great Britain Pound", digits: 5 },
  { symbol: "EURJPY", name: "Euro vs Japanese Yen", digits: 3 },
  { symbol: "GBPJPY", name: "Great Britain Pound vs Japanese Yen", digits: 3 },
  { symbol: "AUDJPY", name: "Australian Dollar vs Japanese Yen", digits: 3 },
  { symbol: "AUDCAD", name: "Australian Dollar vs Canadian Dollar", digits: 5 },
  { symbol: "EURCAD", name: "Euro vs Canadian Dollar", digits: 5 },
  { symbol: "EURAUD", name: "Euro vs Australian Dollar", digits: 5 },
  { symbol: "BTCUSD", name: "Bitcoin vs US Dollar", digits: 2 },
  { symbol: "ETHUSD", name: "Ethereum vs US Dollar", digits: 2 },
  { symbol: "XRPUSD", name: "Ripple vs US Dollar", digits: 4 },
  { symbol: "LTCUSD", name: "Litecoin vs US Dollar", digits: 2 },
  { symbol: "SOLUSD", name: "Solana vs US Dollar", digits: 2 },
  { symbol: "BNBUSD", name: "Binance Coin vs US Dollar", digits: 2 },
];

function splitPrice(p: number, digits: number) {
  const s = p.toFixed(digits);
  return { big: s.slice(0, -1), small: s.slice(-1) };
}

export default function QuotesList() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useMT5Sub();

  useEffect(() => {
    mt5Store.initializeSymbols();
    const acc = mt5Store.getAccount?.();
    if (acc) setAccount(acc);
    else {
      try {
        const raw = localStorage.getItem("mt5_account");
        if (raw) setAccount(JSON.parse(raw));
      } catch {}
    }
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {}
  }, []);

  const getCurrentPrice = (symbol: string) => {
    const sym = mt5Store.getSymbol(symbol);
    return sym?.price || 1.0;
  };

  const handleSymbolClick = (symbol: string) => {
    localStorage.setItem("mt5_selected_symbol", symbol);
    router.push("/mt5/chart");
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header — hamburger opens sidebar, search on the right. Quote-list icon removed. */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-3 pb-3 border-b border-white/10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 active:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-white/80" />
        </button>
        <h1 className="text-center text-lg font-semibold">Quotes</h1>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5" aria-label="Search">
          <Search className="h-4 w-4 text-white/80" />
        </button>
      </header>

      <ul className="divide-y divide-white/5">
        {SYMBOLS.map((s) => {
          const price = getCurrentPrice(s.symbol);
          const change = +(Math.random() * 1.2 - 0.6).toFixed(2);
          const pct = price > 0 ? +((change / price) * 100).toFixed(2) : 0;
          const up = change >= 0;
          const color = up ? "text-sky-400" : "text-rose-400";

          const bid = +(price - price * 0.00008).toFixed(s.digits);
          const ask = +(price + price * 0.00008).toFixed(s.digits);
          const bidS = splitPrice(bid, s.digits);
          const askS = splitPrice(ask, s.digits);

          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          const ss = String(now.getSeconds()).padStart(2, "0");

          return (
            <li
              key={s.symbol}
              onClick={() => handleSymbolClick(s.symbol)}
              className="grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 active:bg-white/5"
            >
              <div className="min-w-0">
                <div className="text-[11px] tabular-nums">
                  <span className="text-white/60">{change >= 0 ? "+" : ""}{change}</span>{" "}
                  <span className={pct >= 0 ? "text-sky-400" : "text-rose-400"}>{pct}%</span>
                </div>
                <div className="truncate text-[15px] font-bold tracking-wide">{s.symbol}</div>
                <div className="text-[11px] text-white/40 tabular-nums">{hh}:{mm}:{ss}</div>
              </div>
              <div className="text-right">
                <div className={`tabular-nums leading-none ${color}`}>
                  <span className="text-[15px]">{bidS.big}</span>
                  <span className="text-[22px] font-bold">{bidS.small}</span>
                </div>
                <div className="mt-1 text-[10px] text-white/40 tabular-nums">L: {(bid * 0.999).toFixed(s.digits)}</div>
              </div>
              <div className="text-right">
                <div className={`tabular-nums leading-none ${color}`}>
                  <span className="text-[15px]">{askS.big}</span>
                  <span className="text-[22px] font-bold">{askS.small}</span>
                </div>
                <div className="mt-1 text-[10px] text-white/40 tabular-nums">H: {(ask * 1.001).toFixed(s.digits)}</div>
              </div>
            </li>
          );
        })}
      </ul>

      <MT5Sidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        account={account}
        user={user}
      />
    </div>
  );
}
