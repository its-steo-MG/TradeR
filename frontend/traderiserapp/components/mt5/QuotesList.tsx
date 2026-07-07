"use client";

import { useRouter } from "next/navigation";
import {
  Search,
  Pencil,
  List,
  LogOut,
  Wallet,
  X,
  TrendingUp,
  Shield,
  Settings,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import { useMT5Sub } from "@/lib/use-mt5-tick";
import { mt5Store } from "@/lib/mt5-store";
import { useEffect, useState } from "react";

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

    if (acc) {
      setAccount(acc);
    } else {
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

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("mt5_selected_symbol");
    localStorage.removeItem("mt5_account");
    mt5Store.setPositions?.([]);

    setIsSidebarOpen(false);
    router.push("/mt5");
  };

  const goToWallet = () => {
    setIsSidebarOpen(false);
    router.push("/wallet");
  };

  const isReal =
    account?.type === "real" ||
    account?.account_type === "mt5" ||
    account?.account_type === "standard";

  const accountLabel = isReal ? "REAL ACCOUNT" : "DEMO ACCOUNT";
  const accountTag = isReal ? "Live Funds" : "Virtual Funds";
  const displayLogin =
    account?.mt5_login ||
    account?.login ||
    (isReal ? "Real Account" : "Demo Account");
  const displayBalance = Number(account?.balance ?? 0).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  const displayName =
    user?.username || user?.email?.split("@")[0] || "Trader";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <header className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 pt-3 pb-3 border-b border-white/10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 active:bg-white/10"
        >
          <List className="h-5 w-5 text-white/80" />
        </button>
        <h1 className="text-center text-lg font-semibold">Quotes</h1>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
          <Pencil className="h-4 w-4 text-white/80" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
          <Search className="h-4 w-4 text-white/80" />
        </button>
      </header>

      {/* Quotes List */}
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
                  <span className="text-white/60">
                    {change >= 0 ? "+" : ""}
                    {change}
                  </span>{" "}
                  <span
                    className={pct >= 0 ? "text-sky-400" : "text-rose-400"}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="truncate text-[15px] font-bold tracking-wide">
                  {s.symbol}
                </div>
                <div className="text-[11px] text-white/40 tabular-nums">
                  {hh}:{mm}:{ss}
                </div>
              </div>

              <div className="text-right">
                <div className={`tabular-nums leading-none ${color}`}>
                  <span className="text-[15px]">{bidS.big}</span>
                  <span className="text-[22px] font-bold">{bidS.small}</span>
                </div>
                <div className="mt-1 text-[10px] text-white/40 tabular-nums">
                  L: {(bid * 0.999).toFixed(s.digits)}
                </div>
              </div>

              <div className="text-right">
                <div className={`tabular-nums leading-none ${color}`}>
                  <span className="text-[15px]">{askS.big}</span>
                  <span className="text-[22px] font-bold">{askS.small}</span>
                </div>
                <div className="mt-1 text-[10px] text-white/40 tabular-nums">
                  H: {(ask * 1.001).toFixed(s.digits)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Slim Sidebar */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-full max-w-[300px] bg-gradient-to-b from-[#0b1220] via-[#0a0f1c] to-[#050810] border-r border-white/10 shadow-2xl transform transition-transform duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } flex flex-col`}
        >
          {/* Big MT5 Image Header */}
          <div className="relative h-52 w-full overflow-hidden">
            <Image
              src="/mt5.png"
              alt="MT5"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 hover:bg-black/70 text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="absolute bottom-6 left-6">
              <h2 className="text-3xl font-bold text-white tracking-tighter">MT5 Trading</h2>
              <p className="text-blue-400">MetaTrader 5 • Professional</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Profile */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-sky-500/20">
                  {initials || "T"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{displayName}</div>
                  {displayEmail && (
                    <div className="text-xs text-white/50 truncate">
                      {displayEmail}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    isReal
                      ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70"
                      : "bg-amber-400 shadow-[0_0_8px] shadow-amber-400/70"
                  }`}
                />
                <span className="text-xs text-white/60">Account Type</span>
              </div>
              <span
                className={`text-xs font-semibold tracking-wide ${
                  isReal ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {accountLabel}
              </span>
            </div>

            {/* Balance - Smaller & Semi-Bold */}
            <div
              className={`relative overflow-hidden rounded-2xl p-5 border ${
                isReal
                  ? "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/25"
                  : "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/25"
              }`}
            >
              <div className="text-xs text-white/60">Available Balance</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
                ${displayBalance}
              </div>
            </div>

            {/* Menu */}
            <nav className="space-y-2">
              <button
                onClick={goToWallet}
                className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-xl px-4 py-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Deposit / Withdraw</div>
                  <div className="text-xs text-white/50">Manage your funds</div>
                </div>
              </button>
            </nav>
          </div>

          {/* Logout */}
          <div className="px-5 py-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-3 text-left transition-colors border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              <div>
                <div className="text-sm font-semibold">Logout from MT5</div>
                <div className="text-xs text-red-400/70">
                  Return to connect screen
                </div>
              </div>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}