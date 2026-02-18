"use client"

import type { Signal } from "@/lib/api"
import { TradingViewWidget } from "./tradingview-widget"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"  // Assume you have this from shadcn/ui or similar
import { useState } from "react"

interface SignalResultCardProps {
  signal: Signal
  onScanAgain: () => void
}

export default function SignalResultCard({ signal, onScanAgain }: SignalResultCardProps) {
  const router = useRouter()
  const [stake, setStake] = useState(10)  // Default stake

  const directionColor = signal.direction === "buy" ? "text-green-500" : "text-red-500"
  const directionBg = signal.direction === "buy" ? "bg-green-500/20" : "bg-red-500/20"
  const directionLabel = signal.direction === "buy" ? "BUY / Rise" : "SELL / Fall"

  const marketName = typeof signal.market === 'object' && signal.market?.name 
    ? signal.market.name 
    : `Market ${signal.market || 'Unknown'}`

  const chartSymbol = typeof signal.market === 'object' && signal.market?.name 
    ? signal.market.name 
    : "EURUSD"

  const currentPrice = signal.current_price || 1.10000
  const multiplier = typeof signal.market === 'object' && signal.market?.profit_multiplier 
    ? Number(signal.market.profit_multiplier) 
    : 1.85

  const probability = signal.probability || 0
  const strength = signal.strength || 0

  // Recommended stake based on probability and strength
  const recommendedStake = Math.min(200, 10 + (probability - 60) * 2 + strength * 1.5)

  // Format as plain number (no $)
  const formatPrice = (price: number | undefined | null) => {
    return price != null ? Number(price).toFixed(5) : "N/A"
  }

  // Calculate potential for a given stake
  const calcPotential = (stk: number) => {
    const profitIfWin = stk * (multiplier - 1)
    const lossIfLoss = -stk
    const expectedValue = (probability / 100) * profitIfWin + ((100 - probability) / 100) * lossIfLoss
    return {
      win: `+$${profitIfWin.toFixed(2)} (Total $${(stk * multiplier).toFixed(2)})`,
      loss: `-$${stk.toFixed(2)}`,
      expected: expectedValue.toFixed(2)
    }
  }

  const getProgressColor = (prob: number) => {
    if (prob < 50) return "bg-red-500"
    if (prob < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const handleTradeSignal = () => {
    const tp = formatPrice(signal.take_profit)
    const sl = formatPrice(signal.stop_loss)
    router.push(`/trading?signal=true&tp=${tp}&sl=${sl}&market=${marketName}`)
  }

  // Update stake on input
  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value > 0) setStake(value)
  }

  const potential = calcPotential(stake)

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{marketName}</h2>
        <p className="text-gray-400 text-sm sm:text-base">
          Generated {new Date(signal.generated_at).toLocaleTimeString()} (Timeframe: {signal.timeframe || '1 minute'})
        </p>
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-black/50 border border-gray-800 overflow-hidden">
        <div className="aspect-video w-full">
          <TradingViewWidget symbol={chartSymbol} />
        </div>
      </div>

      {/* Direction Badge */}
      <div className="flex justify-center">
        <div className={`${directionBg} ${directionColor} px-8 py-4 rounded-xl font-bold text-xl sm:text-2xl`}>
          {directionLabel}
        </div>
      </div>

      {/* Probability */}
      <div className="space-y-2 max-w-md mx-auto w-full">
        <div className="flex justify-between text-sm sm:text-base text-gray-400">
          <span>Probability</span>
          <span>{probability}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(probability)}`}
            style={{ width: `${Math.min(probability, 100)}%` }}
          />
        </div>
      </div>

      {/* TP/SL Cards (no $) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
        <div className="bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/50 rounded-xl p-6">
          <p className="text-green-400 text-sm font-semibold mb-1">Take Profit</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">At {formatPrice(signal.take_profit)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-500/50 rounded-xl p-6">
          <p className="text-red-400 text-sm font-semibold mb-1">Stop Loss</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">At {formatPrice(signal.stop_loss)}</p>
        </div>
      </div>

      {/* Stake Input and Potential Calculations */}
      <div className="space-y-4 max-w-md mx-auto w-full">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Enter Stake (USD) - Recommended: ${recommendedStake.toFixed(2)}</label>
          <Input
            type="number"
            value={stake}
            onChange={handleStakeChange}
            className="bg-gray-800 text-white border-gray-700"
            min={1}
          />
        </div>
        <div className="space-y-2">
          <p className="text-gray-400 text-sm font-semibold">For ${stake.toFixed(2)} Stake:</p>
          <p className="text-green-400">If Win: {potential.win}</p>
          <p className="text-red-400">If Loss: {potential.loss}</p>
          <p className="text-blue-400">Expected Value (based on prob): ${potential.expected}</p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-400 text-sm font-semibold">Examples:</p>
          {[10, 50, 100].map((exampleStake) => {
            const exPotential = calcPotential(exampleStake)
            return (
              <p key={exampleStake} className="text-gray-300 text-sm">
                ${exampleStake}: Win {exPotential.win} / Loss {exPotential.loss} / EV ${exPotential.expected}
              </p>
            )
          })}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto w-full">
        <Button
          onClick={handleTradeSignal}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 text-lg rounded-xl"
        >
          Trade This Signal
        </Button>
        <Button
          onClick={onScanAgain}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 text-lg rounded-xl"
        >
          Scan Again
        </Button>
      </div>
    </div>
  )
}