"use client";

import { Eye, EyeOff, Zap, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";

interface BalanceCardProps {
  balance: number;
  username: string;
  isRealAccount: boolean;
  showBalance: boolean;
  onToggleBalance: () => void;
  accountType?: string; // "demo" | "standard" | "pro-fx" | "mt5"
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
  const isMt5 = accountType === "mt5";
  const isDemoAccount = accountType === "demo";

  // Color Logic
  let mainColor = "blue";
  let gradientFrom = "from-blue-600";
  let gradientTo = "to-blue-800";
  let accentColor = "blue";
  let statusColor = "amber";

  if (isProFx) {
    mainColor = "purple";
    gradientFrom = "from-purple-600";
    gradientTo = "to-purple-800";
    accentColor = "purple";
    statusColor = "green";
  } else if (isMt5) {
    mainColor = "teal";
    gradientFrom = "from-teal-600";
    gradientTo = "to-teal-800";
    accentColor = "teal";
    statusColor = "green";
  } else if (isRealAccount) {
    mainColor = "orange";
    gradientFrom = "from-orange-600";
    gradientTo = "to-orange-800";
    accentColor = "orange";
    statusColor = "green";
  }

  return (
    <div className="w-full mb-8">
      <div className="relative group perspective">
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-r ${gradientFrom}/20 via-pink-600/10 to-purple-600/20 rounded-3xl animate-pulse`} />
        </div>

        {/* Main Card */}
        <div className={`relative rounded-3xl p-8 lg:p-12 glass backdrop-blur-2xl overflow-hidden border border-white/15 shadow-2xl hover:shadow-3xl transition-all duration-500 group/card bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>

          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br from-${mainColor}-400 to-pink-500 rounded-full blur-lg opacity-0 group-hover/card:opacity-40 transition-opacity duration-500`} />
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/traderiser-logo-512-XQKYiMKYDs3FHo4yZyfpTS70vqF8qV.png"
                    alt="Traderiser"
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl ring-2 ring-white/20"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-white/70 uppercase tracking-widest font-semibold">
                    {isDemoAccount ? "Demo" : isMt5 ? "MT5" : isProFx ? "Pro-FX" : "Live"} Account
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent">
                    {isMt5 ? "MT5" : isProFx ? "Pro-FX" : isRealAccount ? "Real" : "Demo"}
                  </h3>
                </div>
              </div>
            </div>

            {/* Balance Section */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs sm:text-sm text-white/60 uppercase tracking-widest font-semibold">Account Balance</p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  {isDemoAccount ? (
                    <><Zap size={14} className="text-amber-400" /><span className="text-xs text-amber-300 font-semibold">Demo</span></>
                  ) : (
                    <><TrendingUp size={14} className={`text-${statusColor}-400`} /><span className={`text-xs text-${statusColor}-300 font-semibold`}>Live</span></>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 group/balance hover:bg-white/8 hover:border-white/20 transition-all duration-300">
                <div className="flex-1">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                    {showBalance ? `$${formatCurrency(balance)}` : "••••••••"}
                  </h2>
                </div>
                <button
                  onClick={onToggleBalance}
                  className="flex-shrink-0 p-3 sm:p-4 hover:bg-white/10 rounded-xl transition-all duration-200 group/eye"
                  aria-label={showBalance ? "Hide balance" : "Show balance"}
                >
                  {showBalance ? (
                    <Eye size={24} className={`text-${accentColor}-400 group-hover/eye:text-${accentColor}-300 transition-colors`} />
                  ) : (
                    <EyeOff size={24} className="text-white/40 group-hover/eye:text-white/60 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Footer Info */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">Account Holder</p>
                <p className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">{username}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">Status</p>
                <div className="flex items-center justify-end gap-2">
                  <div className={`w-2 h-2 rounded-full bg-${statusColor}-400 animate-pulse`} />
                  <p className={`text-sm sm:text-base font-semibold text-${statusColor}-400`}>
                    {isDemoAccount ? "Sandbox" : "Active"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}