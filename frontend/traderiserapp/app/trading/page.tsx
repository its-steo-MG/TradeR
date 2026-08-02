// app/trading/page.tsx
"use client"

import { useState } from "react"
import TradingPageClient from "@/components/trading/trading-page-client"
import AISignalBot from "@/components/trading/ai-signal-bot"

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState<"trading" | "signals">("trading")

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Sticky Tab Bar — liquid glass card style */}
        <div className="sticky top-0 z-50 p-4 sm:p-6 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
          <div className="w-full pl-0 md:pl-64 lg:pl-72">
            <div className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10">
              <button
                onClick={() => setActiveTab("trading")}
                className={`
                  relative min-w-fit px-6 sm:px-7 py-3 rounded-xl font-semibold text-sm sm:text-base
                  transition-all whitespace-nowrap
                  ${
                    activeTab === "trading"
                      ? "drop-on-top bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span className="relative z-[1]">Trading Interface</span>
              </button>

              <button
                onClick={() => setActiveTab("signals")}
                className={`
                  relative min-w-fit px-6 sm:px-7 py-3 rounded-xl font-semibold text-sm sm:text-base
                  transition-all whitespace-nowrap
                  ${
                    activeTab === "signals"
                      ? "drop-on-top bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span className="relative z-[1]">AI Signal Bot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "trading" && <TradingPageClient />}
          {activeTab === "signals" && <AISignalBot />}
        </div>
      </div>
    </div>
  )
}