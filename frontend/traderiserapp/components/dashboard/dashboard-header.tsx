"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  username: string;
  email: string;
  isRealAccount: boolean;
  accountType: string;
}

export function DashboardHeader({ username, isRealAccount, accountType }: DashboardHeaderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const platforms = [
    { name: "MT5", logo: "/mt5.png" },
    { name: "Traderiser", logo: "/images/traderiser-logo-192.png" },
    { name: "Deriv", logo: "/deriv-account-icon.png" },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveIndex((i) => (i + 1) % platforms.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
      {/* Soft top shine only — not over the text */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent dark:from-white/10" />

      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/traderiser-logo-512-XQKYiMKYDs3FHo4yZyfpTS70vqF8qV.png"
            alt="Traderiser"
            className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-white/20"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">
              {greeting}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {username}
            </h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-600 dark:bg-white/10 dark:text-zinc-300">
                {accountType}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${isRealAccount ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                {isRealAccount ? "Live" : "Practice"}
              </span>
            </div>
          </div>
        </div>

        <div className="drop-on-top relative z-[1] flex shrink-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-white/70 bg-white/30 px-3 py-2 backdrop-blur-lg dark:border-white/20 dark:bg-white/10">
          {platforms.map((p, i) => (
            <div
              key={p.name}
              className={cn(
                "relative z-[1] flex flex-col items-center transition-all duration-500",
                i === activeIndex ? "scale-110 opacity-100" : "scale-95 opacity-50"
              )}
            >
              <Image src={p.logo} alt={p.name} width={36} height={36} className="h-9 w-9 object-contain" />
              <span className="mt-0.5 text-[9px] font-medium text-slate-600 dark:text-zinc-300">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
