"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingUp, StopCircle, Timer } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { mutate } from "swr"
import RobotConfigPanel from "./robot-config-panel"
import RobotTradingLogs from "./robot-trading-logs"
import WalletDisplay from "@/components/wallet-display"
import { useMediaQuery } from "react-responsive"
import { ForexPair } from "@/hooks/use-forex-data"

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
  is_ea?: boolean
  max_open_positions?: number
  win_rate_normal?: number
  win_rate_sashi?: number
}

interface UserRobot {
  id: number
  robot: Robot
  is_running: boolean
  purchased_at?: string
}

interface RawBotLog {
  id?: number
  timestamp: string
  message: string
  profit_loss?: number | string
  trade_result?: "win" | "loss"
}

interface BackendUserRobot {
  id: number
  robot: {
    id: number
    name: string
    description?: string
    is_ea?: boolean
    max_open_positions?: number
    win_rate_normal?: number | string
    win_rate_sashi?: number | string
  }
  is_running?: boolean
  purchased_at?: string
  is_ea?: boolean
  max_open_positions?: number
}

interface PageProps {
  setIsNavVisible?: (visible: boolean) => void
}

export default function RobotsPage({ setIsNavVisible }: PageProps) {
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
  const sessionStartTimeRef = useRef<number | null>(null)

  const isMobile = useMediaQuery({ maxWidth: 640 })

  /* ------------------------------------------------------------------ */
  /* 1. Load initial data + Restore running robot after refresh        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const loginTypeStored = (localStorage.getItem("login_type") || "real") as "real" | "demo"
        setLoginType(loginTypeStored)

        const [pairsRes, ownedRes] = await Promise.all([
          api.getForexPairs(),
          api.getMyForexRobots(),
        ])

        if (pairsRes.data?.pairs) setPairs(pairsRes.data.pairs)

        const ownedList: BackendUserRobot[] = ownedRes.data?.user_robots || []

        const normalized: UserRobot[] = ownedList.map((ur) => ({
          id: ur.id,
          robot: {
            id: ur.robot.id,
            name: ur.robot.name,
            description: ur.robot.description || "No description",
            is_ea: ur.is_ea || ur.robot.is_ea || false,
            max_open_positions: ur.max_open_positions || ur.robot.max_open_positions || 2,
            win_rate_normal: Number(ur.robot.win_rate_normal ?? 0),
            win_rate_sashi: Number(ur.robot.win_rate_sashi ?? 0),
          },
          is_running: ur.is_running || false,
          purchased_at: ur.purchased_at,
        }))

        setUserRobots(normalized)
      } catch (error) {
        console.error("Load error:", error)
        toast.error("Failed to load robots")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    return () => stopPolling()
  }, [])

  // Restore active EA/normal robot after page refresh
  useEffect(() => {
    const runningRobot = userRobots.find((ur) => ur.is_running)
    if (runningRobot && !activeUserRobotId) {
      setActiveUserRobotId(runningRobot.id)
      setIsRunning(true)
      sessionStartTimeRef.current = Date.now() - 120000 // Allow older logs (2 minutes buffer)
      startPolling(runningRobot.id)
    }
  }, [userRobots])

  /* ------------------------------------------------------------------ */
  /* 2. Toggle Robot - Improved EA Handling                             */
  /* ------------------------------------------------------------------ */
  const toggleRobot = async (
    userRobotId: number,
    config?: { stake?: number; pair_id?: number; timeframe?: string }
  ) => {
    try {
      const userRobot = userRobots.find((ur) => ur.id === userRobotId)
      if (!userRobot) {
        toast.error("Robot not found")
        return
      }

      const isEA = userRobot.robot.is_ea === true
      const wasRunning = userRobot.is_running

      const payload = isEA
        ? { pair_id: config?.pair_id, timeframe: config?.timeframe || "M1" }
        : { stake: config?.stake || 10, pair_id: config?.pair_id, timeframe: config?.timeframe || "M1" }

      const response = await api.toggleForexRobot(userRobotId, payload)

      if (response.error) {
        toast.error(`Toggle failed: ${response.error}`)
        return
      }

      const nowRunning = response.data?.is_running ?? false

      // Update local UI state
      setUserRobots((prev) =>
        prev.map((ur) =>
          ur.id === userRobotId ? { ...ur, is_running: nowRunning } : ur
        )
      )
      setIsRunning(nowRunning)

      // === EA STOP LOGIC ===
      if (!nowRunning && isEA && wasRunning) {
        const toastId = toast.loading("Stopping EA and closing all its positions...")

        try {
          const closeResponse = await api.closeEAPositions(userRobotId)
          const closedCount = closeResponse.data?.closed_count || 0

          toast.success(
            `✅ EA stopped successfully. Closed ${closedCount} position(s).`,
            { id: toastId }
          )

          // Force refresh positions on Trades page
          mutate("/forex/positions/")
        } catch (closeErr) {                    // ← Fixed: removed ": any"
          console.error("Failed to close EA positions:", closeErr)
          toast.error(
            "EA stopped, but failed to close positions automatically. Close them manually on Trades page.",
            { id: toastId }
          )
          mutate("/forex/positions/") // Still attempt refresh
        }
      } 
      // Normal robot or starting EA
      else {
        toast.success(
          nowRunning
            ? (isEA ? "🚀 EA Bot Activated!" : "Bot started successfully!")
            : "Bot stopped successfully"
        )
      }

      // Handle polling & logs
      if (nowRunning) {
        sessionStartTimeRef.current = Date.now()
        setActiveUserRobotId(userRobotId)
        startPolling(userRobotId)
      } else {
        setActiveUserRobotId(null)
        stopPolling()
        setLogs([])                    // Clear logs only when explicitly stopped
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to toggle robot"
      console.error("Toggle error:", error)
      toast.error(message)
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Fetch Logs */
  /* ------------------------------------------------------------------ */
  const fetchLogs = async (userRobotId: number) => {
    try {
      const res = await api.getForexBotLogsByRobot(userRobotId)

      let rawLogs: RawBotLog[] = []

      if (Array.isArray(res.data)) rawLogs = res.data
      else if (res.data?.bot_logs) rawLogs = res.data.bot_logs

      const sessionStart = sessionStartTimeRef.current || 0

      const newRawLogs = rawLogs.filter((log) => {
        if (!log?.timestamp) return false
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= sessionStart
      })

      const formattedNewLogs: BotLog[] = newRawLogs.map((log, idx) => {
        let level: BotLog["level"] = "info"
        const profit = log.profit_loss != null ? Number(log.profit_loss) : null

        if (log.trade_result === "win" && profit !== null) level = "success"
        else if (log.trade_result === "loss" && profit !== null) level = "error"
        else if (log.message?.toLowerCase().includes("opening") || log.message?.toLowerCase().includes("opened"))
          level = "entry"
        else if (log.message?.toLowerCase().includes("closed")) level = "success"
        else if (log.message?.toLowerCase().includes("analyzing")) level = "analysis"

        return {
          id: log.id?.toString() || `log-${Date.now()}-${idx}`,
          timestamp: new Date(log.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          level,
          message: log.message || "",
          data: profit !== null ? { profit } : undefined,
        }
      })

      setLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id))
        const uniqueNewLogs = formattedNewLogs.filter((log) => !existingIds.has(log.id))
        return [...prev, ...uniqueNewLogs]
      })
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4. Polling */
  /* ------------------------------------------------------------------ */
  const startPolling = (userRobotId: number) => {
    stopPolling()
    fetchLogs(userRobotId)

    pollRef.current = setInterval(() => fetchLogs(userRobotId), 4000)

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

  const clearAllLogs = () => {
    setLogs([])
    toast.success("Logs cleared")
  }

  const hasPurchased = userRobots.length > 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Bots</h1>
        <WalletDisplay />
      </div>

      {!isLoading && !hasPurchased && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Bots Purchased Yet</h3>
          <p className="text-muted-foreground">Purchase a bot to start automated trading</p>
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
                }
              }}
              isLoading={isLoading}
              activeRobotId={activeUserRobotId}
            />

            <Card>
              <CardHeader>
                <CardTitle>Your Robots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userRobots.map((ur) => (
                  <div key={ur.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {ur.robot.name}
                        {ur.robot.is_ea && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">EA</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Win Rate: {loginType === "demo" ? ur.robot.win_rate_normal : ur.robot.win_rate_sashi}%
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={ur.is_running ? "destructive" : "default"}
                      onClick={() => toggleRobot(ur.id)}
                    >
                      {ur.is_running ? "Stop" : "Start"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col">
            {isRunning && activeUserRobotId ? (
              <>
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                  <Timer className="w-5 h-5 animate-pulse text-emerald-400" />
                  <span className="font-medium">Next cycle in {countdown}s</span>
                </div>

                <div className="flex-1 bg-card rounded-xl border overflow-hidden">
                  <RobotTradingLogs
                    logs={logs}
                    isRunning={true}
                    onClearLogs={clearAllLogs}
                    onTogglePause={() => {}}
                    onRefreshLogs={() => activeUserRobotId && fetchLogs(activeUserRobotId)}
                    onStopTrading={() => toggleRobot(activeUserRobotId)}
                    forceAutoScroll
                  />
                </div>

                <Button
                  onClick={() => toggleRobot(activeUserRobotId)}
                  className="mt-4 w-full bg-red-600 hover:bg-red-700 py-3 font-bold"
                >
                  <StopCircle className="w-5 h-5 mr-2" />
                  Stop Trading Bot
                </Button>
              </>
            ) : (
              <Card className="flex-1 flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Active Robot</h3>
                  <p className="text-muted-foreground">Select a robot and start it to see live logs.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}