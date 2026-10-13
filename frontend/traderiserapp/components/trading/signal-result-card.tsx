"use client"

import type { Signal } from "@/lib/api"
import { TradingViewWidget } from "./tradingview-widget"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface SignalResultCardProps {
  signal: Signal
  onScanAgain: () => void
}

export default function SignalResultCard({ signal, onScanAgain }: SignalResultCardProps) {
  const router = useRouter()
  const [stake, setStake] = useState(10)

  const directionColor = signal.direction === "buy" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
  const directionBg = signal.direction === "buy" ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"
  const directionLabel = signal.direction === "buy" ? "BUY / Rise" : "SELL / Fall"

  const marketName = typeof signal.market === "object" && signal.market?.name
    ? signal.market.name
    : `Market ${signal.market || "Unknown"}`

  const chartSymbol = typeof signal.market === "object" && signal.market?.name
    ? signal.market.name
    : "EURUSD"

  const multiplier = typeof signal.market === "object" && signal.market?.profit_multiplier
    ? Number(signal.market.profit_multiplier)
    : 1.85

  const probability = signal.probability || 0
  const strength = signal.strength || 0
  const recommendedStake = Math.min(200, 10 + (probability - 60) * 2 + strength * 1.5)

  const formatPrice = (price: number | undefined | null) => {
    return price != null ? Number(price).toFixed(5) : "N/A"
  }

  const calcPotential = (stk: number) => {
    const profitIfWin = stk * (multiplier - 1)
    const lossIfLoss = -stk
    const expectedValue = (probability / 100) * profitIfWin + ((100 - probability) / 100) * lossIfLoss
    return {
      win: `+$${profitIfWin.toFixed(2)} (Total $${(stk * multiplier).toFixed(2)})`,
      loss: `-$${stk.toFixed(2)}`,
      expected: expectedValue.toFixed(2),
    }
  }

  const getProgressColor = (prob: number) => {
    if (prob < 50) return "bg-rose-500"
    if (prob < 70) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const handleTradeSignal = () => {
    const tp = formatPrice(signal.take_profit)
    const sl = formatPrice(signal.stop_loss)
    router.push(`/trading?signal=true&tp=${tp}&sl=${sl}&market=${marketName}`)
  }

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value > 0) setStake(value)
  }

  const potential = calcPotential(stake)

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">{marketName}</h2>
        <p className="text-slate-500 dark:text-zinc-400 text-sm sm:text-base">
          Generated {new Date(signal.generated_at).toLocaleTimeString()} (Timeframe: {signal.timeframe || "1 minute"})
        </p>
      </div>

      <div className="rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="aspect-video w-full">
          <TradingViewWidget symbol={chartSymbol} />
        </div>
      </div>

      <div className="flex justify-center">
        <div className={`${directionBg} ${directionColor} px-8 py-4 rounded-xl font-bold text-xl sm:text-2xl border border-slate-200 dark:border-zinc-700`}>
          {directionLabel}
        </div>
      </div>

      <div className="space-y-2 max-w-md mx-auto w-full">
        <div className="flex justify-between text-sm sm:text-base text-slate-500 dark:text-zinc-400">
          <span>Probability</span>
          <span>{probability}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-4 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${getProgressColor(probability)}`} style={{ width: `${Math.min(probability, 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl p-6">
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold mb-1">Take Profit</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">At {formatPrice(signal.take_profit)}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 rounded-xl p-6">
          <p className="text-rose-700 dark:text-rose-300 text-sm font-semibold mb-1">Stop Loss</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">At {formatPrice(signal.stop_loss)}</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto w-full">
        <div className="space-y-2">
          <label className="text-slate-500 dark:text-zinc-400 text-sm">Enter Stake (USD) - Recommended: ${recommendedStake.toFixed(2)}</label>
          <Input type="number" value={stake} onChange={handleStakeChange} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-slate-200 dark:border-zinc-700" min={1} />
        </div>
        <div className="space-y-2">
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">For ${stake.toFixed(2)} Stake:</p>
          <p className="text-emerald-700 dark:text-emerald-400">If Win: {potential.win}</p>
          <p className="text-rose-700 dark:text-rose-400">If Loss: {potential.loss}</p>
          <p className="text-blue-700 dark:text-blue-400">Expected Value (based on prob): ${potential.expected}</p>
        </div>
        <div className="space-y-2">
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">Examples:</p>
          {[10, 50, 100].map((exampleStake) => {
            const exPotential = calcPotential(exampleStake)
            return (
              <p key={exampleStake} className="text-slate-700 dark:text-zinc-300 text-sm">
                ${exampleStake}: Win {exPotential.win} / Loss {exPotential.loss} / EV ${exPotential.expected}
              </p>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto w-full">
        <Button onClick={handleTradeSignal} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 text-lg rounded-xl">
          Trade This Signal
        </Button>
        <Button onClick={onScanAgain} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white font-bold py-4 text-lg rounded-xl">
          Scan Again
        </Button>
      </div>
    </div>
  )
}
