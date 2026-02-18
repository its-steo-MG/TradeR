"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Zap, DollarSign, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Robot {
  id: number
  name: string
  description?: string
  win_rate_normal?: number
  win_rate_sashi?: number
}

interface ForexPair {
  id: number
  name: string
  base_currency: string
  quote_currency: string
}

interface RobotConfigPanelProps {
  purchasedRobots: Robot[]
  pairs: ForexPair[]
  onStartTrading: (config: {
    robotId: number
    pairId: number
    stake: number
    timeframe: string
  }) => void
  isLoading?: boolean
  activeRobotId?: number | null
}

const TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "10m", label: "10 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
]

export default function RobotConfigPanel({
  purchasedRobots,
  pairs,
  onStartTrading,
  isLoading = false,
  activeRobotId,
}: RobotConfigPanelProps) {
  const [selectedRobot, setSelectedRobot] = useState<number | null>(activeRobotId ?? null)
  const [selectedPair, setSelectedPair] = useState<number | null>(null)
  const [stake, setStake] = useState("10")
  const [timeframe, setTimeframe] = useState("1m")
  const [openDropdown, setOpenDropdown] = useState<"robot" | "pair" | "timeframe" | null>(null)

  /* ------------------------------------------------------------------ */
  /* Auto-select first robot & pair */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (purchasedRobots.length > 0 && selectedRobot === null) {
      setSelectedRobot(purchasedRobots[0].id)
    }
    if (pairs.length > 0 && selectedPair === null) {
      setSelectedPair(pairs[0].id)
    }
  }, [purchasedRobots, pairs, selectedRobot, selectedPair])

  /* ------------------------------------------------------------------ */
  /* Start Trading */
  /* ------------------------------------------------------------------ */
  const handleStartTrading = () => {
    if (!selectedRobot) {
      toast.error("Please select a robot")
      return
    }
    if (!selectedPair) {
      toast.error("Please select a trading pair")
      return
    }
    const stakeNum = Number.parseFloat(stake)
    if (Number.isNaN(stakeNum) || stakeNum <= 0) {
      toast.error("Please enter a valid stake amount")
      return
    }

    onStartTrading({
      robotId: selectedRobot,
      pairId: selectedPair,
      stake: stakeNum,
      timeframe,
    })

    setOpenDropdown(null)
  }

  const selectedRobotData = purchasedRobots.find((r) => r.id === selectedRobot)
  const selectedPairData = pairs.find((p) => p.id === selectedPair)

  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 backdrop-blur-md border border-purple-500/30 shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-purple-600/40 to-cyan-600/40 border-b border-purple-500/30">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
          <CardTitle className="text-xl font-bold text-white">
            Configure Trading Bot
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* ---------- ROBOT SELECTION ---------- */}
        <div>
          <label className="text-sm font-semibold text-purple-200 mb-2 block flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Select Robot
          </label>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "robot" ? null : "robot")}
              className="w-full px-4 py-3 rounded-xl border border-purple-500/50 bg-white/10 backdrop-blur hover:bg-white/20 transition-all flex items-center justify-between text-white font-medium"
            >
              <span>{selectedRobotData?.name || "Choose a robot"}</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform text-purple-300",
                  openDropdown === "robot" && "rotate-180"
                )}
              />
            </button>

            {openDropdown === "robot" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-purple-900/90 backdrop-blur-lg border border-purple-500/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {purchasedRobots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => {
                      setSelectedRobot(bot.id)
                      setOpenDropdown(null)
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm border-b border-purple-500/30 last:border-0 hover:bg-purple-800/50 transition-colors",
                      selectedRobot === bot.id && "bg-gradient-to-r from-cyan-600/40 to-purple-600/40 font-bold"
                    )}
                  >
                    {bot.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- PAIR SELECTION ---------- */}
        <div>
          <label className="text-sm font-semibold text-purple-200 mb-2 block">
            Trading Pair
          </label>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "pair" ? null : "pair")}
              className="w-full px-4 py-3 rounded-xl border border-purple-500/50 bg-white/10 backdrop-blur hover:bg-white/20 transition-all flex items-center justify-between text-white font-medium"
            >
              <span>{selectedPairData?.name || "Choose a pair"}</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform text-purple-300",
                  openDropdown === "pair" && "rotate-180"
                )}
              />
            </button>

            {openDropdown === "pair" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-purple-900/90 backdrop-blur-lg border border-purple-500/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {pairs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPair(p.id)
                      setOpenDropdown(null)
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm border-b border-purple-500/30 last:border-0 hover:bg-purple-800/50 transition-colors",
                      selectedPair === p.id && "bg-gradient-to-r from-cyan-600/40 to-purple-600/40 font-bold"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- STAKE INPUT ---------- */}
        <div>
          <label className="text-sm font-semibold text-purple-200 mb-2 block flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Stake per Trade
          </label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="10.00"
            className="bg-white/10 border-purple-500/50 text-white placeholder:text-purple-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          <p className="text-xs text-purple-300 mt-1">
            Amount risked per trade (deducted from FX wallet)
          </p>
        </div>

        {/* ---------- TIMEFRAME ---------- */}
        <div>
          <label className="text-sm font-semibold text-purple-200 mb-2 block">
            Timeframe
          </label>
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "timeframe" ? null : "timeframe")}
              className="w-full px-4 py-3 rounded-xl border border-purple-500/50 bg-white/10 backdrop-blur hover:bg-white/20 transition-all flex items-center justify-between text-white font-medium"
            >
              <span>
                {TIMEFRAMES.find((t) => t.value === timeframe)?.label || "Select timeframe"}
              </span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform text-purple-300",
                  openDropdown === "timeframe" && "rotate-180"
                )}
              />
            </button>

            {openDropdown === "timeframe" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-purple-900/90 backdrop-blur-lg border border-purple-500/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => {
                      setTimeframe(tf.value)
                      setOpenDropdown(null)
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm border-b border-purple-500/30 last:border-0 hover:bg-purple-800/50 transition-colors",
                      timeframe === tf.value && "bg-gradient-to-r from-cyan-600/40 to-purple-600/40 font-bold"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- CONFIG SUMMARY ---------- */}
        {selectedRobotData && selectedPairData && (
          <div className="p-4 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/40 rounded-xl text-sm">
            <div className="font-bold text-white mb-2">Trade Summary</div>
            <div className="space-y-1 text-purple-100">
              <div className="flex justify-between">
                <span>Robot:</span>
                <span className="font-medium">{selectedRobotData.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Pair:</span>
                <span className="font-medium">{selectedPairData.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Stake:</span>
                <span className="font-medium text-green-400">
                  ${Number.parseFloat(stake).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Timeframe:</span>
                <span className="font-medium">
                  {TIMEFRAMES.find((t) => t.value === timeframe)?.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---------- START BUTTON ---------- */}
        <Button
          onClick={handleStartTrading}
          disabled={isLoading || !selectedRobot || !selectedPair}
          className={cn(
            "w-full h-12 text-lg font-bold rounded-xl transition-all duration-300",
            "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700",
            "shadow-lg hover:shadow-cyan-500/50 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-3">Loading</span>
              Starting Bot...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2 animate-pulse" />
              Run Trading Bot
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}