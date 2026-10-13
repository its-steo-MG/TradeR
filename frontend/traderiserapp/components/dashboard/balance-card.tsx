"use client";

import { Eye, EyeOff, Zap, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import Image from "next/image";

interface BalanceCardProps {
  balance: number;
  username: string;
  isRealAccount: boolean;
  showBalance: boolean;
  onToggleBalance: () => void;
  accountType?: string;
}

export function BalanceCard({
  balance,
  username,
  isRealAccount,
  showBalance,
  onToggleBalance,
  accountType = "demo",
}: BalanceCardProps) {
  const isProFx = accountType === "pro-fx";
  const isMt5Real = accountType === "mt5";
  const isMt5Demo = accountType === "mt5-demo";
  const isDemoAccount = accountType === "demo" || isMt5Demo;

  let from = "from-blue-600";
  let to = "to-blue-800";
  if (isProFx) { from = "from-purple-600"; to = "to-purple-800"; }
  else if (isMt5Real) { from = "from-teal-600"; to = "to-teal-800"; }
  else if (isMt5Demo) { from = "from-amber-500"; to = "to-amber-700"; }
  else if (isRealAccount) { from = "from-orange-500"; to = "to-orange-700"; }

  const label = isMt5Demo ? "MT5 Demo" : isDemoAccount ? "Demo" : isMt5Real ? "MT5 Real" : isProFx ? "Pro-FX" : "Live";

  const iconSrc = isProFx
    ? "/pro-fx-account-icon.png"
    : isDemoAccount
    ? "/demo-account-icon.png"
    : "/real-account-icon.png";
  const iconAlt = isProFx ? "Pro-FX" : isDemoAccount ? "Demo Account" : "Real Account";

  return (
    <section className={`relative overflow-hidden rounded-[1.8rem] border border-white/30 bg-gradient-to-br ${from} ${to} p-6 text-white shadow-2xl sm:p-8`}>
      <div className="pointer-events-none absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/15">
              <Image src={iconSrc} alt={iconAlt} width={36} height={36} className="h-9 w-9 object-cover" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/80">{label} account</p>
              <h3 className="text-lg font-bold">{label}</h3>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold">
            {isDemoAccount ? <Zap size={13} /> : <TrendingUp size={13} />}
            {isDemoAccount ? "Demo" : "Live"}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">Total balance</p>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/25 bg-black/20 px-5 py-4">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              {showBalance ? `$${formatCurrency(balance)}` : "••••••••"}
            </h2>
            <button onClick={onToggleBalance} className="rounded-xl p-2 hover:bg-white/10" aria-label="Toggle balance">
              {showBalance ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="uppercase tracking-wide text-white/90">{username}</span>
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isDemoAccount ? "bg-amber-300" : "bg-emerald-300"}`} />
            {isDemoAccount ? "Sandbox" : "Active"}
          </span>
        </div>
      </div>
    </section>
  );
}
