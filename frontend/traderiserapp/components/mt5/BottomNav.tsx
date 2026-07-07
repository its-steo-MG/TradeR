"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownUp, CandlestickChart, LineChart, History, Bot } from "lucide-react";

const items = [
  { to: "/mt5", label: "Quotes", icon: ArrowDownUp, exact: true },
  { to: "/mt5/chart", label: "Chart", icon: CandlestickChart },
  { to: "/mt5/trade", label: "Trade", icon: LineChart },
  { to: "/mt5/history", label: "History", icon: History },
  { to: "/mt5/bots", label: "Bots", icon: Bot },
] as const;

export default function BottomNav() {
  const path = usePathname() || "/";
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#1c1c1e]/95 px-2 py-1.5 shadow-2xl backdrop-blur">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path === it.to || path.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link key={it.to} href={it.to} className={`flex min-w-[60px] flex-col items-center justify-center rounded-full px-3 py-1.5 text-[10px] transition-colors ${active ? "bg-white/10 text-sky-400" : "text-white/70"}`}>
              <Icon className={`h-5 w-5 ${active ? "text-sky-400" : "text-white/80"}`} strokeWidth={active ? 2.2 : 1.7} />
              <span className="mt-0.5">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
