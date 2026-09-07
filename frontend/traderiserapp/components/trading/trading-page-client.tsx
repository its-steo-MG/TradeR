// components/trading/trading-page-client.tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { TradingInterface } from "@/components/trading/trading-interface"
import { TradeHistory } from "@/components/trading/trade-history"
import { TradingViewWidget } from "@/components/trading/tradingview-widget"
import { TradingModeSelector } from "@/components/trading/trading-mode-selector"
import { EliteRobotInterface } from "@/components/trading/elite-robot-interface"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TradeExecutionQueue } from "@/components/trading/trade-execution-queue"
import { TradeExecutionBadge } from "@/components/trading/trade-execution-badge"
import { formatCurrency } from "@/lib/format-currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import MarketAnalysis from "@/components/trading/market-analysis"

interface Market {
  id: number
  name: string
  profit_multiplier: string
}

interface UserRobot {
  id: number
  robot: {
    id: number
    name: string
    available_for_demo?: boolean
    is_elite_robot?: boolean
  }
  purchased_at: string | null
  is_used?: boolean       
  is_setting?: boolean     
}

interface DashboardData {
  user: {
    username: string
    email: string
  }
  accounts: Array<{
    account_type: string
    balance: string | number
  }>
  session_active: boolean
}

interface TradeParams {
  market_id: number
  trade_type_id: number
  direction: string
  amount: number
  account_type: string
  use_martingale: boolean
  martingale_level: number
  targetProfit: number
  stopLoss: number
  profit: number
}

const mapToTradingViewSymbol = (market: string): string => {
  const tradingViewPrefixes: { [key: string]: string } = {
    EURUSD: "OANDA:EURUSD",
    USDJPY: "OANDA:USDJPY",
    GBPUSD: "OANDA:GBPUSD",
    USDCHF: "OANDA:USDCHF",
    AUDUSD: "OANDA:AUDUSD",
    USDCAD: "OANDA:USDCAD",
    NZDUSD: "OANDA:NZDUSD",
    BTCUSDT: "BINANCE:BTCUSDT",
    ETHUSDT: "BINANCE:ETHUSDT",
    BTCUSD: "COINBASE:BTCUSD",
    ETHUSD: "COINBASE:ETHUSD",
    XRPUSDT: "BINANCE:XRPUSDT",
    SOLUSDT: "BINANCE:SOLUSDT",
    BNBUSDT: "BINANCE:BNBUSDT",
    DOGEUSDT: "BINANCE:DOGEUSDT",
    ADAUSDT: "BINANCE:ADAUSDT",
    TRXUSDT: "BINANCE:TRXUSDT",
    AAPL: "NASDAQ:AAPL",
  }
  return tradingViewPrefixes[market] || `OANDA:${market}`
}

export default function TradingPageClient() {
  const router = useRouter()
  const hasShownStartToast = useRef(false)

  const showError = (message: string) => toast.error(message)
  const showTradeResult = (isWin: boolean, profit: number, amount: number, sessionProfit: number) => {
    if (isWin) {
      toast.success(`WIN +$${formatCurrency(profit)}`, {
        description: `Profit/Loss: $${formatCurrency(sessionProfit)}`,
      })
    } else {
      toast(`LOSS -$${formatCurrency(Math.abs(profit))}`, {
        description: `Profit/Loss: $${formatCurrency(sessionProfit)}`,
      })
    }
  }

  const [startingBalance, setStartingBalance] = useState<number>(0)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)
  const [selectedRobot, setSelectedRobot] = useState<number | null>(null)
  const [tradingMode, setTradingMode] = useState<"manual" | "robot">("manual")
  const [balance, setBalance] = useState<number>(0)
  const [sessionProfit, setSessionProfit] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executingTrades, setExecutingTrades] = useState<any[]>([])
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [isAutoTrading, setIsAutoTrading] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>("standard")
  const [chartType, setChartType] = useState<"tradingview" | "analysis">("tradingview")
  const [isEliteMode, setIsEliteMode] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAccountType = localStorage.getItem("account_type") || "standard"
      setSelectedAccount(storedAccountType)
    }
  }, [])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [dashboardRes, marketsRes, userRobotsRes] = await Promise.all([
          api.getDashboard(),
          api.getMarkets(),
          api.getUserRobots(),
        ])

        if (dashboardRes.error) throw new Error(dashboardRes.error as string)
        if (marketsRes.error) throw new Error(marketsRes.error as string)
        if (userRobotsRes.error) throw new Error(userRobotsRes.error as string)

        const dashboard = dashboardRes.data as DashboardData
        setDashboardData(dashboard)
        setMarkets(marketsRes.data as Market[])
        setUserRobots(userRobotsRes.data as UserRobot[])

        const accountObj = dashboard.accounts.find(
          (acc) => acc.account_type === selectedAccount,
        )
        const accountBalance = accountObj && accountObj.balance !== undefined ? Number(accountObj.balance) : 0

        if (isNaN(accountBalance)) throw new Error("Invalid balance value from API")

        setStartingBalance(accountBalance)
        setBalance(accountBalance)
        setSessionProfit(0)
        setIsSessionActive(dashboard.session_active)
      } catch (err) {
        const errorMessage = (err as Error).message
        setError(errorMessage)
        showError(`Failed to load: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [selectedAccount])

const handleRobotSelect = (robotId: number | null) => {
  setSelectedRobot(robotId)

  if (robotId) {
    const ur = userRobots.find((r) => r.robot.id === robotId)

    // Permanent Elite once is_setting is true, otherwise only when not used
    const shouldBeElite =
      !!ur?.robot?.is_elite_robot &&
      (!!ur?.is_setting || !ur?.is_used)

    if (shouldBeElite) {
      setIsEliteMode(true)
      setTradingMode("robot")
    } else {
      setIsEliteMode(false)
    }
  } else {
    setIsEliteMode(false)
  }
}

  const handleStartTrading = (tradeParams: TradeParams) => {
    const marketObj = markets.find((m) => m.name === selectedMarket)
    const newTrade = {
      id: Date.now().toString(),
      market: selectedMarket || "NASDAQ:AAPL",
      direction: tradeParams.direction as "buy" | "sell",
      amount: tradeParams.amount,
      status: "pending" as const,
      market_id: tradeParams.market_id,
      trade_type_id: tradeParams.trade_type_id,
      robot_id: tradingMode === "robot" ? (selectedRobot ?? undefined) : undefined,
      use_martingale: tradeParams.use_martingale,
      martingale_level: tradeParams.martingale_level,
      targetProfit: tradeParams.targetProfit,
      stopLoss: tradeParams.stopLoss,
      profit_multiplier: marketObj?.profit_multiplier || "1",
    }
    setExecutingTrades((prev) => [...prev, newTrade])
    setShowExecutionModal(true)
    setIsAutoTrading(true)

    if (!hasShownStartToast.current) {
      hasShownStartToast.current = true
      toast(`Trading started - $${formatCurrency(tradeParams.amount)} stake`)
    }
  }

  const handleTradeExecutionComplete = (
    tradeId: string,
    profit: number,
    isWin: boolean,
    amount: number,
    entrySpot?: number,
    exitSpot?: number,
    currentSpot?: number,
  ) => {
    setExecutingTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId ? { ...t, status: "completed", profit, isWin, entrySpot, exitSpot, currentSpot } : t,
      ),
    )

    const newSessionProfit = sessionProfit + profit
    setSessionProfit(newSessionProfit)
    setBalance(startingBalance + newSessionProfit)

    showTradeResult(isWin, profit, amount, newSessionProfit)
  }

  const handleStopTrading = () => {
    setIsAutoTrading(false)
    setExecutingTrades((prev) => prev.filter((t) => t.status === "completed"))
    hasShownStartToast.current = false
    toast.success("Trading stopped")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white text-sm sm:text-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading trading platform...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400 text-sm sm:text-base">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Loading Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  const selectedEliteRobot = userRobots.find((r) => r.robot.id === selectedRobot)

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen">
          <div className="flex-1 overflow-auto ml-0 lg:ml-64">
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 md:mb-8">
                Trading Dashboard
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="md:col-span-1 lg:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6">
                  {/* Balance cards */}
                  <div className="rounded-lg bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4">
                    <p className="text-xs text-white/60 mb-1">Account Balance</p>
                    <p className="text-lg sm:text-xl font-bold text-green-400 truncate">
                      ${formatCurrency(balance)}
                    </p>
                    <p className="text-xs text-white/60 mt-1 flex items-center justify-between">
                      <span>Session P/L:</span>
                      <span
                        className={`font-mono font-semibold px-2 py-1 rounded-full text-xs ${
                          sessionProfit >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        ${sessionProfit.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-lg bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4">
                      <p className="text-xs text-white/60 mb-1">Session Profit</p>
                      <p className={`text-lg sm:text-xl font-bold ${sessionProfit >= 0 ? "text-green-400" : "text-red-400"} truncate`}>
                        ${sessionProfit.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4">
                      <p className="text-xs text-white/60 mb-1">Trading Mode</p>
                      <p className="text-lg sm:text-xl font-bold text-pink-400 capitalize">
                        {isEliteMode ? "Elite Robot" : tradingMode}
                      </p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="flex justify-end mb-2">
                    <Select value={chartType} onValueChange={(value: "tradingview" | "analysis") => setChartType(value)}>
                      <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                        <SelectValue placeholder="Select Chart" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-white/10">
                        <SelectItem value="tradingview">Trading View</SelectItem>
                        <SelectItem value="analysis">Technical Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full">
                    {chartType === "tradingview" ? (
                      <TradingViewWidget
                        symbol={selectedMarket ? mapToTradingViewSymbol(selectedMarket) : "NASDAQ:AAPL"}
                      />
                    ) : (
                      <MarketAnalysis market={selectedMarket} />
                    )}
                  </div>

                  {/* Mode selector */}
                  <div className="w-full">
                    <TradingModeSelector
                      onModeChange={(mode) => {
                        setTradingMode(mode)
                        if (mode === "manual") {
                          setIsEliteMode(false)
                          setSelectedRobot(null)
                        }
                      }}
                      selectedRobot={selectedRobot}
                      onRobotSelect={handleRobotSelect}
                      userRobots={userRobots}
                    />
                  </div>

                  {/* ========== MAIN TRADING AREA ========== */}
                  <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6">
                    {isEliteMode && selectedEliteRobot ? (
                      <EliteRobotInterface
                        robotName={selectedEliteRobot.robot.name}
                        accountType={selectedAccount}
                        onResetToNormal={() => {
                          setIsEliteMode(false)
                          setSelectedRobot(null)
                          setTradingMode("manual")
                        }}
                      />
                    ) : (
                      <TradingInterface
                        markets={markets}
                        selectedMarket={selectedMarket}
                        onMarketSelect={setSelectedMarket}
                        balance={balance}
                        onBalanceChange={setBalance}
                        onSessionProfitChange={setSessionProfit}
                        tradingMode={tradingMode}
                        selectedRobot={selectedRobot}
                        onStartTrading={handleStartTrading}
                        accountType={selectedAccount}
                      />
                    )}
                  </div>
                </div>

                {/* Right column - Trade History */}
                <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4 lg:p-6 sticky top-20 overflow-y-auto">
                    <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 uppercase tracking-wider">
                      Recent Trades
                    </h3>
                    <TradeHistory
                      sessionTrades={executingTrades
                        .filter((t) => t.status === "completed")
                        .map((t) => ({
                          id: t.id,
                          market: t.market,
                          direction: t.direction,
                          amount: t.amount,
                          status: t.status,
                          is_win: !!t.isWin,
                          profit: t.profit ?? 0,
                          timeLeft: t.timeLeft,
                          entrySpot: t.entrySpot,
                          market_id: t.market_id,
                          trade_type_id: t.trade_type_id,
                          robot_id: t.robot_id,
                          use_martingale: t.use_martingale,
                          martingale_level: t.martingale_level,
                          targetProfit: t.targetProfit,
                          stopLoss: t.stopLoss,
                          profit_multiplier: t.profit_multiplier,
                          created_at: new Date().toISOString(),
                        }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <TradeExecutionQueue
              trades={executingTrades}
              onTradeComplete={handleTradeExecutionComplete}
              onStopTrading={handleStopTrading}
              isVisible={showExecutionModal}
              totalSessionProfit={sessionProfit}
              isTradingActive={isAutoTrading}
              isSessionActive={isSessionActive}
              userRobots={userRobots}
              selectedRobot={selectedRobot}
              onClose={() => setShowExecutionModal(false)}
              accountType={selectedAccount}
            />
          </div>

          <TradeExecutionBadge
            activeTradesCount={executingTrades.filter((t) => t.status !== "completed").length}
            onClick={() => setShowExecutionModal(true)}
          />
        </div>
      </div>
    </div>
  )
}