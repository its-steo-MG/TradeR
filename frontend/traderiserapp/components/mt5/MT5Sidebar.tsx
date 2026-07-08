"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Wallet, LogOut } from "lucide-react";
import { mt5Store } from "@/lib/mt5-store";

interface Props {
  open: boolean;
  onClose: () => void;
  account: any;
  user: any;
}

export default function MT5Sidebar({ open, onClose, account, user }: Props) {
  const router = useRouter();

  const isReal =
    account?.type === "real" ||
    account?.account_type === "mt5" ||
    account?.account_type === "standard";

  const accountLabel = isReal ? "REAL ACCOUNT" : "DEMO ACCOUNT";
  const displayBalance = Number(account?.balance ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayName = user?.username || user?.email?.split("@")[0] || "Trader";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const goToWallet = () => {
    onClose();
    router.push("/wallet");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("mt5_selected_symbol");
    localStorage.removeItem("mt5_account");
    mt5Store.setPositions?.([]);
    onClose();
    router.push("/mt5");
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        className={`absolute left-0 top-0 h-full w-full max-w-[300px] bg-gradient-to-b from-[#0b1220] via-[#0a0f1c] to-[#050810] border-r border-white/10 shadow-2xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="relative h-52 w-full overflow-hidden">
          <Image src="/mt5.png" alt="MT5" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 hover:bg-black/70 text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-6 left-6">
            <h2 className="text-3xl font-bold text-white tracking-tighter">MT5 Trading</h2>
            <p className="text-blue-400">MetaTrader 5 • Professional</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-sky-500/20">
                {initials || "T"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{displayName}</div>
                {displayEmail && (
                  <div className="text-xs text-white/50 truncate">{displayEmail}</div>
                )}
              </div>
            </div>
          </div>

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

        <div className="px-5 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl px-4 py-3 text-left transition-colors border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Logout from MT5</div>
              <div className="text-xs text-red-400/70">Return to connect screen</div>
            </div>
          </button>
        </div>
      </aside>
    </div>
  );
}
