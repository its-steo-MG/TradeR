"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"

interface ExecutingTrade {
  id: string
  market: string
  direction: "buy" | "sell" | "rise" | "fall"
  amount: number
  status: "pending" | "executing" | "completed"
  isWin?: boolean
  profit?: number
  timeLeft?: number
  entrySpot?: number | string
  exitSpot?: number | string
  currentSpot?: number | string
  market_id: number
  trade_type_id: number
  robot_id?: number
  use_martingale: boolean
  martingale_level: number
  targetProfit: number
  stopLoss: number
  profit_multiplier: string
}

interface UserRobot {
  id: number
  robot: {
    id: number
    name: string
  }
}

interface TradeExecutionQueueProps {
  trades: ExecutingTrade[]
  onTradeComplete: (
    tradeId: string,
    profit: number,
    isWin: boolean,
    amount: number,
    entrySpot?: number,
    exitSpot?: number,
    currentSpot?: number,
  ) => void
  onStopTrading?: () => void
  onClose?: () => void
  isVisible?: boolean
  totalSessionProfit?: number
  isTradingActive?: boolean
  isSessionActive?: boolean
  userRobots: UserRobot[]
  selectedRobot: number | null
  accountType: string
}

interface TradeData {
  profit: number | string
  is_win: boolean
  entry_spot?: string | number
  exit_spot?: string | number
  current_spot?: string | number
}

interface ApiTradeResponse {
  error?: string
  data?: {
    trades: TradeData[]
  }
}

export function TradeExecutionQueue({
  trades,
  onTradeComplete,
  onStopTrading,
  onClose,
  isVisible = true,
  totalSessionProfit = 0,
  isTradingActive = true,
  userRobots,
  selectedRobot,
  accountType,
}: TradeExecutionQueueProps) {
  const { toast } = useToast()
  const [localTrades, setLocalTrades] = useState<ExecutingTrade[]>([])
  const [message, setMessage] = useState<{
    text: string
    isProfit: boolean
    robotName?: string
    amount?: number
  } | null>(null)
  const [baseTradeParams, setBaseTradeParams] = useState<ExecutingTrade | null>(null)
  const [targetProfitReached, setTargetProfitReached] = useState(false)
  const [processedTradeIds, setProcessedTradeIds] = useState<Set<string>>(new Set())
  const [messageAcknowledged, setMessageAcknowledged] = useState(false)
  const [shouldStopTrading, setShouldStopTrading] = useState(false)
  const maxLevels = 5
  const martingaleMultiplier = 2

  useEffect(() => {
    if (trades.length > 0) {
      const newTrade = trades[trades.length - 1]
      setLocalTrades((prev) =>
        prev.some((t) => t.id === newTrade.id)
          ? prev
          : [...prev, { ...newTrade, timeLeft: newTrade.status === "pending" ? 5 : newTrade.timeLeft }],
      )
      if (!baseTradeParams) {
        setBaseTradeParams(newTrade)
        setTargetProfitReached(false)
        setShouldStopTrading(false)
      }
    } else {
      setLocalTrades([])
      setBaseTradeParams(null)
      setTargetProfitReached(false)
      setShouldStopTrading(false)
    }
  }, [trades, baseTradeParams])

  useEffect(() => {
    if (baseTradeParams && !shouldStopTrading) {
      if (baseTradeParams.targetProfit > 0 && totalSessionProfit >= baseTradeParams.targetProfit) {
        setShouldStopTrading(true)
        setTargetProfitReached(true)
        const robotName = selectedRobot ? userRobots.find((r) => r.robot.id === selectedRobot)?.robot.name : null

        const newMessage = {
          text: robotName
            ? `Congratulations! Your ${robotName} has printed $${formatCurrency(totalSessionProfit)}. Your target has been hit!`
            : `Congratulations! Your target profit of $${formatCurrency(baseTradeParams.targetProfit)} has been attained! Total profit: $${formatCurrency(totalSessionProfit)}`,
          isProfit: true,
          robotName: robotName || undefined,
          amount: totalSessionProfit,
        }

        setMessage(newMessage)
        setMessageAcknowledged(false)
        onStopTrading?.()
        return
      }
      if (baseTradeParams.stopLoss > 0 && totalSessionProfit <= -baseTradeParams.stopLoss) {
        setShouldStopTrading(true)
        setTargetProfitReached(true)
        setMessage({
          text: `Stop loss reached. Loss: $${Math.abs(totalSessionProfit).toFixed(2)}. Try again next round!`,
          isProfit: false,
          amount: Math.abs(totalSessionProfit),
        })
        setMessageAcknowledged(false)
        onStopTrading?.()
        return
      }
    }
  }, [baseTradeParams, totalSessionProfit, shouldStopTrading, selectedRobot, userRobots, onStopTrading])

  useEffect(() => {
    const processTrades = async () => {
      if (!isTradingActive || !baseTradeParams || shouldStopTrading) return

      for (let i = 0; i < localTrades.length; i++) {
        const trade = localTrades[i]
        if (trade.status !== "pending" || processedTradeIds.has(trade.id)) continue

        if (baseTradeParams.targetProfit > 0 && totalSessionProfit >= baseTradeParams.targetProfit) {
          setShouldStopTrading(true)
          setTargetProfitReached(true)
          const robotName = selectedRobot ? userRobots.find((r) => r.robot.id === selectedRobot)?.robot.name : null

          const newMessage = {
            text: robotName
              ? `Congratulations! Your ${robotName} has printed $${formatCurrency(totalSessionProfit)}. Your target has been hit!`
              : `Congratulations! Your target profit of $${formatCurrency(baseTradeParams.targetProfit)} has been attained! Total profit: $${formatCurrency(totalSessionProfit)}`,
            isProfit: true,
            robotName: robotName || undefined,
            amount: totalSessionProfit,
          }

          setMessage(newMessage)
          setMessageAcknowledged(false)
          onStopTrading?.()
          return
        }

        if (baseTradeParams.stopLoss > 0 && totalSessionProfit <= -baseTradeParams.stopLoss) {
          setShouldStopTrading(true)
          setTargetProfitReached(true)
          setMessage({
            text: `Stop loss reached. Loss: $${Math.abs(totalSessionProfit).toFixed(2)}. Try again next round!`,
            isProfit: false,
            amount: Math.abs(totalSessionProfit),
          })
          setMessageAcknowledged(false)
          onStopTrading?.()
          return
        }

        const currentAmount = trade.amount * Math.pow(martingaleMultiplier, trade.martingale_level)

        setLocalTrades((prev) =>
          prev.map((t) => (t.id === trade.id ? { ...t, status: "executing", timeLeft: 5, amount: currentAmount } : t)),
        )

        try {
          const response = (await api.placeTrade({
            market_id: trade.market_id,
            trade_type_id: trade.trade_type_id,
            direction: trade.direction,
            amount: trade.amount,
            account_type: accountType,
            use_martingale: trade.use_martingale,
            martingale_level: trade.martingale_level,
            robot_id: trade.robot_id,
            target_profit: trade.targetProfit,
            stop_loss: trade.stopLoss,
          })) as ApiTradeResponse

          if (response?.error) {
            const errMsg = response.error
            toast({
              title: "Error",
              description: errMsg,
              variant: "destructive",
            })
            setLocalTrades((prev) =>
              prev.map((t) =>
                t.id === trade.id ? { ...t, status: "completed", profit: -currentAmount, isWin: false } : t,
              ),
            )
            onTradeComplete(trade.id, -currentAmount, false, currentAmount)
            setProcessedTradeIds((prev) => new Set([...prev, trade.id]))
            if (typeof errMsg === "string" && errMsg.includes("Insufficient balance")) {
              setMessage({
                text: "Insufficient balance. Trading stopped.",
                isProfit: false,
              })
              onStopTrading?.()
              return
            }
            continue
          }

          const apiTrades = response?.data?.trades
          if (!apiTrades || apiTrades.length === 0) {
            throw new Error("No trade data returned in response")
          }

          const tradeData = apiTrades[0]
          const profitValue = Number(tradeData.profit)
          if (isNaN(profitValue)) {
            throw new Error("Invalid profit value in trade response")
          }

          setLocalTrades((prev) =>
            prev.map((t) =>
              t.id === trade.id
                ? {
                    ...t,
                    status: "completed",
                    isWin: tradeData.is_win,
                    profit: profitValue,
                    entrySpot: tradeData.entry_spot ? Number.parseFloat(String(tradeData.entry_spot)) : undefined,
                    exitSpot: tradeData.exit_spot ? Number.parseFloat(String(tradeData.exit_spot)) : undefined,
                    currentSpot: tradeData.current_spot ? Number.parseFloat(String(tradeData.current_spot)) : undefined,
                  }
                : t,
            ),
          )

          onTradeComplete(
            trade.id,
            profitValue,
            tradeData.is_win,
            currentAmount,
            tradeData.entry_spot ? Number.parseFloat(String(tradeData.entry_spot)) : undefined,
            tradeData.exit_spot ? Number.parseFloat(String(tradeData.exit_spot)) : undefined,
            tradeData.current_spot ? Number.parseFloat(String(tradeData.current_spot)) : undefined,
          )

          setProcessedTradeIds((prev) => new Set([...prev, trade.id]))

          if (!shouldStopTrading && isTradingActive) {
            let nextMartingaleLevel = 0
            let nextAmount = baseTradeParams.amount
            if (trade.use_martingale && !tradeData.is_win && trade.martingale_level + 1 < maxLevels) {
              nextMartingaleLevel = trade.martingale_level + 1
              nextAmount = baseTradeParams.amount
            }
            const nextTradeId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            const nextTrade: ExecutingTrade = {
              ...baseTradeParams,
              id: nextTradeId,
              amount: nextAmount,
              status: "pending",
              martingale_level: nextMartingaleLevel,
            }
            setLocalTrades((prev) => [...prev, nextTrade])
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to execute trade"
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          setLocalTrades((prev) =>
            prev.map((t) =>
              t.id === trade.id ? { ...t, status: "completed", profit: -currentAmount, isWin: false } : t,
            ),
          )
          onTradeComplete(trade.id, -currentAmount, false, currentAmount)
          setProcessedTradeIds((prev) => new Set([...prev, trade.id]))
          if (errorMessage.includes("Insufficient balance")) {
            setMessage({
              text: "Insufficient balance. Trading stopped.",
              isProfit: false,
            })
            onStopTrading?.()
            return
          }
        }
      }
    }

    processTrades()
  }, [
    localTrades,
    isTradingActive,
    baseTradeParams,
    totalSessionProfit,
    selectedRobot,
    userRobots,
    onTradeComplete,
    onStopTrading,
    toast,
    accountType,
    processedTradeIds,
    shouldStopTrading,
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTrades((prev) =>
        prev.map((trade) =>
          trade.status === "executing" && trade.timeLeft && trade.timeLeft > 0
            ? { ...trade, timeLeft: trade.timeLeft - 1 }
            : trade,
        ),
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const completedTrades = localTrades.filter((t) => t.status === "completed")
  const totalContracts = completedTrades.length
  const wins = completedTrades.filter((t) => t.isWin).length
  const losses = completedTrades.filter((t) => !t.isWin).length

  if (!isVisible) return null

  return (
    <div className="relative">
      <AnimatePresence>
        {message && !messageAcknowledged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            {/* Backdrop with blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={(e) => e.preventDefault()}
            />

            {/* Liquid glass card - Apple iOS 16 style */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative z-10 p-8 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.2)",
              }}
            >
              {/* Gradient overlay for polish */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: message.isProfit
                    ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0) 100%)"
                    : "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0) 100%)",
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div
                    className="p-4 rounded-full"
                    style={{
                      background: message.isProfit ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      border: `2px solid ${message.isProfit ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    }}
                  >
                    {message.isProfit ? (
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-400" />
                    )}
                  </div>
                </div>

                {/* Text Content */}
                <div className="text-center mb-8">
                  <p className="text-base font-semibold leading-relaxed text-white mb-4">{message.text}</p>
                  {message.amount !== undefined && (
                    <p className={`text-4xl font-bold ${message.isProfit ? "text-green-300" : "text-red-300"}`}>
                      ${formatCurrency(message.amount)}
                    </p>
                  )}
                </div>

                {/* Button */}
                <Button
                  onClick={() => {
                    setMessageAcknowledged(true)
                    setMessage(null)
                  }}
                  className="w-full font-bold py-3 rounded-xl transition-all text-white"
                  style={{
                    background: message.isProfit
                      ? "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)",
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${message.isProfit ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = message.isProfit
                      ? "linear-gradient(135deg, rgba(34, 197, 94, 1) 0%, rgba(22, 163, 74, 1) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 1) 0%, rgba(220, 38, 38, 1) 100%)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = message.isProfit
                      ? "linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)"
                  }}
                >
                  View Trade & Exit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 backdrop-blur-2xl"
      >
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Trade Execution</h3>
          <button
            disabled={message !== null && !messageAcknowledged}
            onClick={() => {
              onClose?.()
            }}
            className="text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 sm:p-6 space-y-4">
          <AnimatePresence>
            {localTrades.map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-white">
                    {trade.market} ({trade.direction.toUpperCase()}){" "}
                    {trade.martingale_level > 0 ? `(Martingale Level ${trade.martingale_level})` : ""}
                  </span>
                  <span className="text-xs text-white/60">Trade ID: {trade.id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Amount:</span>
                  <span className="text-white">${trade.amount.toFixed(2)}</span>
                </div>
                {trade.entrySpot !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Entry Spot:</span>
                    <span className="text-white">
                      {(typeof trade.entrySpot === "number"
                        ? trade.entrySpot
                        : Number.parseFloat(trade.entrySpot || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                {trade.status === "executing" && trade.timeLeft !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Time Left:</span>
                    <span className="text-white">{trade.timeLeft}s</span>
                  </div>
                )}
                {trade.status === "completed" && trade.profit !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">P/L:</span>
                    <motion.span
                      className={`font-bold ${trade.isWin ? "text-green-400" : "text-red-400"}`}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      {trade.isWin ? "WIN" : "LOSS"} • $
                      {typeof trade.profit === "number" && !isNaN(trade.profit) ? trade.profit.toFixed(2) : "0.00"}
                    </motion.span>
                  </div>
                )}
                {trade.status === "pending" && <div className="text-xs text-white/60">Waiting...</div>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-white/5 px-4 sm:p-6 py-4 bg-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/60">Trades execute in less than 5 seconds</p>
            <div className="text-sm font-bold">
              <span className="text-white/60">Profit/Loss: </span>
              <span className={totalSessionProfit >= 0 ? "text-green-400" : "text-red-400"}>
                ${formatCurrency(totalSessionProfit)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/60">Contracts</p>
              <p className="text-sm font-bold text-white">{totalContracts}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Won</p>
              <p className="text-sm font-bold text-green-400">{wins}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Lost</p>
              <p className="text-sm font-bold text-red-400">{losses}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              onStopTrading?.()
            }}
            disabled={!isTradingActive}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Stop Trading
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
