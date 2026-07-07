"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut, RefreshCw } from "lucide-react";
import { mt5Store } from "@/lib/mt5-store";

interface MT5Account {
  id: number;
  platform: string;
  account_type: "standard" | "demo";
  balance: number;
  mt5_login?: string;
  created_at?: string;
}

interface MT5NavbarProps {
  mt5Account?: MT5Account | null;
}

export default function MT5Navbar({ mt5Account: propAccount }: MT5NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [acc, setAcc] = useState<MT5Account | null>(null);
  const [equity, setEquity] = useState(0);
  const [open, setOpen] = useState(false);

  // Load account + sync balance from backend
  useEffect(() => {
    const loadAndSync = async () => {
      // Priority 1: Props
      if (propAccount) {
        setAcc(propAccount);
        return;
      }

      // Priority 2: Try to sync from backend (best for fresh balance)
      const fresh = await mt5Store.syncAccountFromBackend();
      if (fresh) {
        setAcc(fresh);
        return;
      }

      // Fallback: localStorage
      const saved = localStorage.getItem("mt5_account");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAcc(parsed);
        } catch (e) {
          console.error("Failed to parse mt5_account");
        }
      }
    };

    loadAndSync();

    // Refresh every 10 seconds (syncs latest balance from backend)
    const interval = setInterval(loadAndSync, 10000);
    return () => clearInterval(interval);
  }, [propAccount]);

  // Calculate equity
  useEffect(() => {
    if (acc) {
      setEquity(acc.balance);
    }
  }, [acc]);

  const nav = [
    { href: "/mt5/dashboard", label: "Terminal" },
    { href: "/mt5/positions", label: "Positions" },
    { href: "/mt5/history", label: "History" },
    { href: "/mt5/robots", label: "Robots" },
  ];

  const switchToTraderiser = () => router.push("/");
  
  const disconnect = () => {
    localStorage.removeItem("mt5_account");
    setAcc(null);
    router.push("/mt5");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-6">
          <Link href="/mt5/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-black text-white">
              M5
            </div>
            <span className="text-sm font-semibold text-white">Traderiser MT5</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  pathname === n.href
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {acc && (
            <div className="hidden items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/50">Balance</div>
                <div className="text-sm font-semibold text-white tabular-nums">
                  ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/50">Equity</div>
                <div className={`text-sm font-semibold tabular-nums ${equity >= acc.balance ? "text-emerald-400" : "text-rose-400"}`}>
                  ${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Account Switcher */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              <span className={`h-2 w-2 rounded-full ${acc?.account_type === "standard" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="font-medium">
                {acc 
                  ? `MT5 ${acc.account_type === "standard" ? "Real" : "Demo"}` 
                  : "No account"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl z-50">
                <button
                  onClick={() => {
                    setOpen(false);
                    switchToTraderiser();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                >
                  <RefreshCw className="h-4 w-4" /> Switch to Traderiser
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    disconnect();
                  }}
                  className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-3 text-left text-sm text-rose-400 hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" /> Disconnect MT5
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}