"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface SignalPurchaseCardProps {
  onPurchaseSuccess: () => void
  aiBotId: number | null  // ← New prop for dynamic ID
}

export default function SignalPurchaseCard({ onPurchaseSuccess, aiBotId }: SignalPurchaseCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleActivate = async () => {
    if (!aiBotId) {
      toast.error("AI Signal Bot ID not found")
      return
    }

    setIsLoading(true)
    try {
      const accountType = localStorage.getItem("login_type") as "demo" | "standard" | undefined

      const response = await api.purchaseRobot(aiBotId, accountType || "standard")  // ← Use dynamic ID

      if (response.error) {
        toast.error(response.error)
        return
      }

      toast.success("AI Signal Bot activated! Start scanning for signals.")
      onPurchaseSuccess()
    } catch (error) {
      toast.error("Failed to activate AI Signal Bot")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!aiBotId) {
    return <div className="text-red-500">Error: AI Signal Bot not configured</div>
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-xl p-8">
        {/* Locked Icon */}
        <div className="text-center mb-6">
          <div className="inline-block bg-green-500/20 border border-green-500/50 rounded-full p-6 mb-4">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white text-center mb-2">AI Signal Bot</h3>

        {/* Description */}
        <p className="text-gray-400 text-center mb-6 text-sm leading-relaxed">
          Real-time AI-powered market signals for forex & crypto. Scans all markets and delivers high-probability
          entries with Take Profit & Stop Loss.
        </p>

        {/* Price */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-green-500 mb-2">$200</div>
          <p className="text-gray-400 text-sm">One-time activation</p>
        </div>

        {/* Activate Button */}
        <Button
          onClick={handleActivate}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
        >
          {isLoading ? "Processing..." : "Activate for $200"}
        </Button>

        {/* Features */}
        <div className="mt-8 space-y-3">
          <p className="text-gray-400 text-xs font-semibold uppercase">Features</p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Global Market Scanning
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> RSI & ATR Analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> High-Probability Signals
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Automatic TP/SL
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}