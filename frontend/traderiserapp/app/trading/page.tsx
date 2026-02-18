"use client"

import { useState } from "react"
import TradingPageClient from "@/components/trading/trading-page-client"
import AISignalBot from "@/components/trading/ai-signal-bot"

export default function Page() {
  const [activeTab, setActiveTab] = useState<"trading" | "signals">("trading")

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Tab Bar – Safe from sidebar overlap */}
      <div className="sticky top-0 z-40 flex flex-wrap gap-3 p-4 sm:p-6 border-b border-gray-800 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80">
        {/* Adjust pl- (padding-left) below to match your sidebar width */}
        {/* Common sidebar widths: 64 (collapsed), 240, 256, 280 */}
        <div className="w-full pl-0 sm:pl-64 lg:pl-72"> {/* ← CHANGE THIS LINE */}
          <div className="flex gap-3 overflow-x-auto pb-2"> {/* Horizontal scroll on very small screens if needed */}
            <button
              onClick={() => setActiveTab("trading")}
              className={`min-w-fit px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === "trading"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Trading Interface
            </button>
            <button
              onClick={() => setActiveTab("signals")}
              className={`min-w-fit px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === "signals"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              AI Signal Bot
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "trading" && <TradingPageClient />}
        {activeTab === "signals" && <AISignalBot />}
      </div>
    </div>
  )
}