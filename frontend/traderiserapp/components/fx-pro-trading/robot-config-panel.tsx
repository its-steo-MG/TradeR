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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, Zap, DollarSign, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import clsx from "clsx"

interface Robot {
  id: number
  name: string
  description?: string
  win_rate_normal?: number
  win_rate_sashi?: number
  is_ea?: boolean
  max_open_positions?: number
}

interface ForexPair {
  id: number
  name: string
}

interface RobotConfigPanelProps {
  purchasedRobots: Robot[]
  pairs: ForexPair[]
  onStartTrading: (config: {
    robotId: number
    pairId: number
    stake?: number
    timeframe: string
  }) => void
  isLoading?: boolean
  activeRobotId?: number | null
}

const TIMEFRAMES = [
  { value: "M1", label: "1 Minute" },
  { value: "M5", label: "5 Minutes" },
  { value: "M15", label: "15 Minutes" },
  { value: "H1", label: "1 Hour" },
  { value: "H4", label: "4 Hours" },
]

export default function RobotConfigPanel({
  purchasedRobots,
  pairs,
  onStartTrading,
  isLoading = false,
  activeRobotId,
}: RobotConfigPanelProps) {
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(activeRobotId ?? null)
  const [selectedPairId, setSelectedPairId] = useState<number | null>(null)
  const [stake, setStake] = useState("10")
  const [timeframe, setTimeframe] = useState("M1")

  const selectedRobot = purchasedRobots.find(r => r.id === selectedRobotId)
  const isEA = selectedRobot?.is_ea === true

  // Auto-select first robot & pair
  useEffect(() => {
    if (purchasedRobots.length > 0 && selectedRobotId === null) {
      setSelectedRobotId(purchasedRobots[0].id)
    }
    if (pairs.length > 0 && selectedPairId === null) {
      setSelectedPairId(pairs[0].id)
    }
  }, [purchasedRobots, pairs, selectedRobotId, selectedPairId])

  const handleStartTrading = () => {
    if (!selectedRobotId) {
      toast.error("Please select a robot")
      return
    }
    if (!selectedPairId) {
      toast.error("Please select a trading pair")
      return
    }

    // Fixed: Proper typed config instead of 'any'
    const config: {
      robotId: number
      pairId: number
      stake?: number
      timeframe: string
    } = {
      robotId: selectedRobotId,
      pairId: selectedPairId,
      timeframe,
    }

    if (!isEA) {
      const stakeNum = parseFloat(stake)
      if (isNaN(stakeNum) || stakeNum <= 0) {
        toast.error("Please enter a valid stake amount")
        return
      }
      config.stake = stakeNum
    }

    onStartTrading(config)
  }

  return (
    <Card className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border border-white/40 dark:border-white/40 dark:border-white/10 overflow-hidden">
      <CardHeader className="bg-pink-500/10 dark:bg-pink-500/15 backdrop-blur-md border-b border-white/40 dark:border-white/40 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-pink-500" />
          <CardTitle className="text-xl font-bold">Robot Configuration</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* EA Mode Banner */}
        {isEA && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
              <Zap className="w-5 h-5" />
              <span className="font-bold text-lg">EXPERT ADVISOR (EA) AI</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
              This is a highly Advanced AI Automatic Expert Advisor.<br />
              It will automatically open and manage multiple positions according to its logic.
            </p>
          </div>
        )}

        {/* Robot Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-white/80">Select Robot</label>
          <Select 
            value={selectedRobotId?.toString() || ""} 
            onValueChange={(val) => setSelectedRobotId(Number(val))}
          >
            <SelectTrigger className="bg-white/60 dark:bg-white/60 dark:bg-zinc-900/60/60 backdrop-blur-md border-white/40 dark:border-white/40 dark:border-white/10 text-slate-900 dark:text-slate-900 dark:text-white">
              <SelectValue placeholder="Choose a robot" />
            </SelectTrigger>
            <SelectContent>
              {purchasedRobots.map((robot) => (
                <SelectItem key={robot.id} value={robot.id.toString()}>
                  {robot.name} {robot.is_ea && "• EA"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pair Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-white/80">Trading Pair</label>
          <Select 
            value={selectedPairId?.toString() || ""} 
            onValueChange={(val) => setSelectedPairId(Number(val))}
          >
            <SelectTrigger className="bg-white/60 dark:bg-white/60 dark:bg-zinc-900/60/60 backdrop-blur-md border-white/40 dark:border-white/40 dark:border-white/10 text-slate-900 dark:text-slate-900 dark:text-white">
              <SelectValue placeholder="Choose pair" />
            </SelectTrigger>
            <SelectContent>
              {pairs.map((pair) => (
                <SelectItem key={pair.id} value={pair.id.toString()}>
                  {pair.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-white/80">Timeframe</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="bg-white/60 dark:bg-white/60 dark:bg-zinc-900/60/60 backdrop-blur-md border-white/40 dark:border-white/40 dark:border-white/10 text-slate-900 dark:text-slate-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stake - Only for non-EA robots */}
        {!isEA && (
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-600 dark:text-white/80 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Stake per Trade ($)
            </label>
            <Input
              type="number"
              step="0.01"
              min="1"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="bg-white/60 dark:bg-white/60 dark:bg-zinc-900/60/60 backdrop-blur-md border-white/40 dark:border-white/40 dark:border-white/10 text-slate-900 dark:text-white text-slate-900 dark:text-white"
              placeholder="10.00"
            />
            <p className="text-xs text-slate-400 dark:text-white/50 mt-1">Amount deducted per trade</p>
          </div>
        )}

        {/* Summary */}
        {selectedRobot && selectedPairId && (
          <div className="bg-white/40 dark:bg-white/50 dark:bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/40 dark:border-white/10 rounded-2xl p-4 text-sm">
            <div className="font-semibold mb-3 text-slate-700 dark:text-white/90">Configuration Summary</div>
            <div className="space-y-2 text-slate-500 dark:text-white/70">
              <div className="flex justify-between">
                <span>Robot:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedRobot.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Pair:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {pairs.find(p => p.id === selectedPairId)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Timeframe:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {TIMEFRAMES.find(t => t.value === timeframe)?.label}
                </span>
              </div>
              {!isEA && (
                <div className="flex justify-between">
                  <span>Stake:</span>
                  <span className="font-medium text-green-400">${parseFloat(stake).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleStartTrading}
          disabled={isLoading || !selectedRobotId || !selectedPairId}
          className={cn(
            "w-full h-14 text-lg font-bold rounded-2xl transition-all",
            "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700",
            "disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          )}
        >
          {isLoading ? (
            "Starting Robot..."
          ) : isEA ? (
            <>
              🚀 <span className="ml-2">Activate EA Bot</span>
            </>
          ) : (
            <>
              ▶ <span className="ml-2">Start Trading Bot</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}