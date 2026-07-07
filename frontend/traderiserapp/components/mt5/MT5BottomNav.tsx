"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpDown, CandlestickChart, History, LineChart, Bot } from "lucide-react";

const items = [
  { href: "/mt5/dashboard", label: "Quotes", icon: ArrowUpDown },
  { href: "/mt5/dashboard?view=chart", label: "Chart", icon: CandlestickChart },
  { href: "/mt5/positions", label: "Trade", icon: LineChart },
  { href: "/mt5/history", label: "History", icon: History },
  { href: "/mt5/robots", label: "Bots", icon: Bot },
];

export default function MT5BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto w-fit md:hidden">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#1a1f2c]/90 px-3 py-2 shadow-2xl backdrop-blur-xl">
        {items.map((it) => {
          const active = pathname === it.href.split("?")[0];
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href}
              className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] transition ${active ? "text-sky-400" : "text-white/60"}`}>
              <Icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
