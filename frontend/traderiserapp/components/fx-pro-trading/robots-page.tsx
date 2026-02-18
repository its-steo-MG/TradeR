"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingUp, StopCircle, Timer } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import RobotConfigPanel from "./robot-config-panel"
import RobotTradingLogs from "./robot-trading-logs"
import WalletDisplay from "@/components/wallet-display"
import { useMediaQuery } from "react-responsive"

// === STRICT TYPES ===
interface BotLog {
  id: string
  timestamp: string
  level: "info" | "analysis" | "entry" | "success" | "warning" | "error"
  message: string
  data?: {
    pair?: string
    entry?: number
    profit?: number
    profitPercentage?: number
  }
}

interface Robot {
  id: number
  name: string
  description?: string
  discounted_price?: number
  original_price?: number
  effective_price?: number
  win_rate_normal?: number
  win_rate_sashi?: number
  profit_multiplier?: number
}

interface RobotRaw {
  id: number
  name: string
  description?: string
  discounted_price?: string | number
  original_price?: string | number
  effective_price?: string | number
  win_rate_normal?: string | number
  win_rate_sashi?: string | number
  profit_multiplier?: string | number
  price?:number
}

interface ForexPair {
  id: number
  name: string
  base_currency: string
  quote_currency: string
}

interface UserRobotRaw {
  id: number
  robot: RobotRaw
  is_running?: boolean
  purchased_at?: string
  price?:number
}

interface UserRobot {
  id: number
  robot: Robot
  is_running?: boolean
  purchased_at?: string
}

interface RawLog {
  id?: number
  timestamp: string
  message: string
  profit_loss?: number | string
  trade_result?: "win" | "loss"
}

interface Wallet {
  account_type: string
  wallet_type: string
  currency: { code: string }
  balance: number | string
}

interface ApiResponse<T> {
  data?: T
  error?: string
}

interface ToggleResponse {
  is_running: boolean
  message?: string
}

interface WalletApiResponse {
  wallets: Wallet[]
}

interface PageProps {
  setIsNavVisible?: (visible: boolean) => void
}

const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default function RobotsPage({ setIsNavVisible }: PageProps) {
  const [availableRobots, setAvailableRobots] = useState<Robot[]>([])
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [pairs, setPairs] = useState<ForexPair[]>([])
  const [logs, setLogs] = useState<BotLog[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeUserRobotId, setActiveUserRobotId] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTimeRef = useRef<number | null>(null)

  const isMobile = useMediaQuery({ maxWidth: 640 })

  /* ------------------------------------------------------------------ */
  /* 1. Load initial data */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const loginTypeStored = (localStorage.getItem("login_type") || "real") as "real" | "demo"
        setLoginType(loginTypeStored)

        const [pairsRes, availRes, ownedRes] = await Promise.all([
          api.getForexPairs(),
          api.getForexRobots(),
          api.getMyForexRobots(),
        ])

        if (pairsRes.data?.pairs) {
          setPairs(pairsRes.data.pairs as ForexPair[])
        }

        if (availRes.data?.robots) {
          setAvailableRobots(
            (availRes.data.robots as RobotRaw[]).map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description || "No description",
              discounted_price: r.discounted_price ? Number(r.discounted_price) : undefined,
              original_price: r.original_price ? Number(r.original_price) : Number(r.price ?? 0),
              effective_price: r.effective_price ? Number(r.effective_price) : Number(r.price ?? 0),
              win_rate_normal: Number(r.win_rate_normal ?? 0),
              win_rate_sashi: Number(r.win_rate_sashi ?? 0),
              profit_multiplier: Number(r.profit_multiplier ?? 1.0),
            })),
          )
        }

        const ownedList: UserRobotRaw[] = []
        if (ownedRes.data) {
          if ("user_robots" in ownedRes.data && Array.isArray(ownedRes.data.user_robots)) {
            ownedList.push(...ownedRes.data.user_robots)
          }
          if ("my_robots" in ownedRes.data && Array.isArray(ownedRes.data.my_robots)) {
            ownedList.push(...ownedRes.data.my_robots)
          }
        }

        const normalized: UserRobot[] = ownedList.map((ur) => ({
          id: ur.id,
          robot: {
            id: ur.robot.id,
            name: ur.robot.name,
            description: ur.robot.description || "No description",
            discounted_price: ur.robot.discounted_price ? Number(ur.robot.discounted_price) : undefined,
            original_price: ur.robot.original_price ? Number(ur.robot.original_price) : Number(ur.robot.price ?? 0),
            effective_price: ur.robot.effective_price ? Number(ur.robot.effective_price) : Number(ur.robot.price ?? 0),
            win_rate_normal: Number(ur.robot.win_rate_normal ?? 0),
            win_rate_sashi: Number(ur.robot.win_rate_sashi ?? 0),
            profit_multiplier: Number(ur.robot.profit_multiplier ?? 1.0),
          },
          is_running: ur.is_running,
          purchased_at: ur.purchased_at,
        }))
        setUserRobots(normalized)

        setSessionId(null)
        sessionStartTimeRef.current = null
      } catch (error) {
        console.error("Load error:", error)
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    return () => {
      stopPolling()
    }
  }, [])

  /* ------------------------------------------------------------------ */
  /* 2. Toggle Robot */
  /* ------------------------------------------------------------------ */
  const toggleRobot = async (
    userRobotId: number,
    config?: { stake?: number; pair_id?: number; timeframe?: string },
  ) => {
    try {
      const apiConfig: { stake?: number; pair_id?: number; timeframe?: string } = {}
      if (config?.stake && !isNaN(config.stake) && config.stake > 0) {
        apiConfig.stake = config.stake
      }
      if (config?.pair_id && Number.isInteger(config.pair_id)) {
        apiConfig.pair_id = config.pair_id
      }
      if (config?.timeframe && typeof config.timeframe === "string" && config.timeframe.trim() !== "") {
        apiConfig.timeframe = config.timeframe
      }

      const response: ApiResponse<ToggleResponse> = await api.toggleForexRobot(
        userRobotId,
        Object.keys(apiConfig).length > 0 ? apiConfig : undefined,
      )

      if (response.data?.is_running !== undefined) {
        const isRunning = response.data.is_running

        setUserRobots((prev) => prev.map((ur) => (ur.id === userRobotId ? { ...ur, is_running: isRunning } : ur)))
        setIsRunning(isRunning)
        toast.success(isRunning ? "Bot started!" : "Bot stopped!")

        if (isRunning) {
          const newSessionId = generateSessionId()
          setSessionId(newSessionId)
          sessionStartTimeRef.current = Date.now()
          setLogs([])
          setActiveUserRobotId(userRobotId)
          startPolling(userRobotId)
        } else {
          setSessionId(null)
          sessionStartTimeRef.current = null
          setLogs([])
          stopPolling()
        }
      }
    } catch (error) {
      console.error("Toggle error:", error)
      toast.error("Failed to toggle bot")
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Fetch Logs + Dispatch Balance Update */
  /* ------------------------------------------------------------------ */
  const fetchLogs = async (userRobotId: number) => {
    try {
      const res: ApiResponse<RawLog[] | { bot_logs?: RawLog[]; logs?: RawLog[] }> =
        await api.getForexBotLogsByRobot(userRobotId)

      let rawLogs: RawLog[] = []
      if (Array.isArray(res.data)) {
        rawLogs = res.data
      } else if (res.data) {
        rawLogs = res.data.bot_logs ?? res.data.logs ?? []
      }

      const sessionStartTime = sessionStartTimeRef.current || 0
      const filtered = rawLogs.filter((log) => {
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= sessionStartTime
      })

      let currentBalance = 0
      try {
        const walletRes: ApiResponse<WalletApiResponse> = await api.getWallets()
        const proFxWallet = walletRes.data?.wallets.find(
          (w) => w.account_type === "pro-fx" && w.wallet_type === "main" && w.currency.code === "USD",
        )
        currentBalance = proFxWallet ? Number(proFxWallet.balance) || 0 : 0
      } catch (e) {
        console.warn("Could not fetch current balance")
      }

      const formatted: BotLog[] = filtered.map((log, idx) => {
        const id = log.id?.toString() ?? `log-${idx}`
        let level: BotLog["level"] = "info"
        const profitLoss = log.profit_loss != null ? Number(log.profit_loss) : null

        if (log.trade_result === "win" && profitLoss !== null) {
          level = "success"
          window.dispatchEvent(new CustomEvent("balance-updated", { detail: currentBalance + profitLoss }))
        } else if (log.trade_result === "loss" && profitLoss !== null) {
          level = "error"
          window.dispatchEvent(new CustomEvent("balance-updated", { detail: currentBalance - Math.abs(profitLoss) }))
        } else if (log.message.toLowerCase().includes("analyzing")) level = "analysis"
        else if (log.message.toLowerCase().includes("entering")) level = "entry"
        else if (log.message.toLowerCase().includes("insufficient")) level = "warning"

        const data: BotLog["data"] = {}
        if (profitLoss != null) data.profit = profitLoss

        return {
          id,
          timestamp: new Date(log.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          level,
          message: log.message,
          data: Object.keys(data).length ? data : undefined,
        }
      })

      setLogs(formatted)
    } catch (error) {
      console.error("Failed to fetch bot logs:", error)
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4. Polling */
  /* ------------------------------------------------------------------ */
  const startPolling = (userRobotId: number) => {
    stopPolling()
    fetchLogs(userRobotId)
    pollRef.current = setInterval(() => fetchLogs(userRobotId), 5000)

    setCountdown(10)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 10 : prev - 1))
    }, 1000)
  }

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    pollRef.current = null
    countdownRef.current = null
  }

  const hasPurchased = userRobots.length > 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Trading Bots</h1>
        <WalletDisplay />
      </div>

      {!isLoading && !hasPurchased && (
        <Card className="bg-card border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Bots Purchased</h3>
          <p className="text-muted-foreground mb-6">Purchase a bot to start automated trading</p>
        </Card>
      )}

      {!isLoading && hasPurchased && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <RobotConfigPanel
              purchasedRobots={userRobots.map((ur) => ur.robot)}
              pairs={pairs}
              onStartTrading={(config) => {
                const userRobot = userRobots.find((ur) => ur.robot.id === config.robotId)
                if (userRobot) {
                  toggleRobot(userRobot.id, {
                    stake: config.stake,
                    pair_id: config.pairId,
                    timeframe: config.timeframe,
                  })
                } else {
                  toast.error("Robot not found")
                }
              }}
              isLoading={isLoading}
              activeRobotId={
                activeUserRobotId ? (userRobots.find((ur) => ur.id === activeUserRobotId)?.robot.id ?? null) : null
              }
            />

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Your Robots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {userRobots.map((ur) => {
                  const winRate =
                    loginType === "demo" ? (ur.robot.win_rate_normal ?? 0) : (ur.robot.win_rate_sashi ?? 0)
                  return (
                    <div
                      key={ur.id}
                      className="p-3 bg-muted/50 rounded-lg border border-border/50 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold">{ur.robot.name}</div>
                        <div className="text-xs text-primary">Win Rate: {winRate}%</div>
                      </div>
                      <Button
                        size="sm"
                        variant={ur.is_running ? "destructive" : "default"}
                        onClick={() => toggleRobot(ur.id)}
                      >
                        {ur.is_running ? "Stop" : "Start"}
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col">
            {isRunning ? (
              <>
                <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Timer className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Next trade in {countdown}s</span>
                </div>

                {isMobile && (
                  <RobotTradingLogs
                    logs={logs}
                    isRunning={isRunning}
                    onClearLogs={() => setLogs([])}
                    onTogglePause={() => {}}
                    onRefreshLogs={() => activeUserRobotId && fetchLogs(activeUserRobotId)}
                    onStopTrading={() => activeUserRobotId && toggleRobot(activeUserRobotId)}
                    forceAutoScroll
                  />
                )}

                {!isMobile && (
                  <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
                    <RobotTradingLogs
                      logs={logs}
                      isRunning={isRunning}
                      onClearLogs={() => setLogs([])}
                      onTogglePause={() => {}}
                      onRefreshLogs={() => activeUserRobotId && fetchLogs(activeUserRobotId)}
                      isVisible={true}
                    />
                  </div>
                )}

                <Button
                  onClick={() => activeUserRobotId && toggleRobot(activeUserRobotId)}
                  className="mt-4 w-full bg-destructive hover:bg-destructive/90 font-bold py-3"
                >
                  <StopCircle className="w-5 h-5 mr-2" />
                  Stop Trading Bot
                </Button>
              </>
            ) : (
              <Card className="bg-card border-border h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Active Bot</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Select a robot and click <strong>Start</strong> to begin trading.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
