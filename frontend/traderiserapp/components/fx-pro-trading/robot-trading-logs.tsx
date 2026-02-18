"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2, Pause, Play, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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

interface RobotTradingLogsProps {
  logs: BotLog[]
  isRunning: boolean
  onClearLogs: () => void
  onTogglePause: () => void
  onRefreshLogs: () => void
  onClose?: () => void
  isVisible?: boolean
  onStopTrading?: () => void
  forceAutoScroll?: boolean
}

const AnimatedLoadingDots = () => {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 rounded-full bg-emerald-500"
          animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  )
}

export default function RobotTradingLogs({
  logs,
  isRunning,
  onClearLogs,
  onTogglePause,
  onRefreshLogs,
  onClose,
  isVisible = true,
  onStopTrading,
  forceAutoScroll = false,
}: RobotTradingLogsProps) {
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const [isNearTop, setIsNearTop] = useState(true)
  const prevLogsLength = useRef(logs.length)

  // Reverse logs: newest at top, oldest at bottom
  const reversedLogs = [...logs].reverse()

  /* --------------------------------------------------------------
   *  AUTO-SCROLL: Always scroll to TOP (newest) when new log arrives
   * -------------------------------------------------------------- */
  useEffect(() => {
    const container = logsContainerRef.current
    if (!container) return

    const shouldAutoScroll = forceAutoScroll || isNearTop

    if (logs.length > prevLogsLength.current && shouldAutoScroll) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }

    prevLogsLength.current = logs.length
  }, [logs.length, isNearTop, forceAutoScroll])

  /* --------------------------------------------------------------
   *  TRACK IF USER IS NEAR TOP (within 100px)
   * -------------------------------------------------------------- */
  useEffect(() => {
    const container = logsContainerRef.current
    if (!container) return

    const checkNearTop = () => {
      const threshold = 100
      const distanceFromTop = container.scrollTop
      setIsNearTop(distanceFromTop <= threshold)
    }

    // Initial check
    checkNearTop()

    const handleScroll = () => {
      if (forceAutoScroll) {
        setIsNearTop(true)
        return
      }
      checkNearTop()
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [forceAutoScroll, logs])

  const getLogStyles = (level: BotLog["level"]) => {
    switch (level) {
      case "success": return "text-emerald-500 bg-emerald-500/10"
      case "analysis": return "text-blue-500 bg-blue-500/10"
      case "entry": return "text-amber-500 bg-amber-500/10"
      case "warning": return "text-orange-500 bg-orange-500/10"
      case "error": return "text-red-500 bg-red-500/10"
      default: return "text-slate-400 bg-slate-500/10"
    }
  }

  const getLevelBadge = (level: BotLog["level"]) => {
    const badges: Record<BotLog["level"], string> = {
      info: "INFO",
      analysis: "ANALYSIS",
      entry: "ENTRY",
      success: "SUCCESS",
      warning: "WARNING",
      error: "ERROR",
    }
    return badges[level]
  }

  if (!isVisible) return null

  const isMobileView = typeof window !== "undefined" && window.innerWidth <= 640

  return isMobileView ? (
    /* MOBILE: Bottom Sheet */
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {isRunning ? <AnimatedLoadingDots /> : <div className="w-2 h-2 rounded-full bg-slate-500" />}
          <span className="text-sm font-semibold text-white">Trading Logs {isRunning ? "(Running)" : "(Paused)"}</span>
          <span className="text-xs text-white/60 ml-2">({logs.length} events)</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-b border-white/5 bg-white/5 flex-wrap">
        <Button size="sm" variant="outline" onClick={onTogglePause} className="h-8 px-3 text-xs bg-transparent border-white/10 text-white hover:bg-white/10">
          {isRunning ? <><Pause className="w-3 h-3 mr-1" /> Pause</> : <><Play className="w-3 h-3 mr-1" /> Resume</>}
        </Button>
        <Button size="sm" variant="outline" onClick={onRefreshLogs} disabled={isRunning} className="h-8 px-3 text-xs bg-transparent border-white/10 text-white hover:bg-white/10 disabled:opacity-50">
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onClearLogs} className="h-8 px-3 text-xs text-red-400 border-white/10 hover:bg-red-500/10 bg-transparent">
          <Trash2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onStopTrading} disabled={!isRunning} className="h-8 px-3 text-xs text-red-500 border-red-500/50 hover:bg-red-500/10 bg-transparent font-bold disabled:opacity-50">
          Stop Bot
        </Button>
      </div>

      <div
        ref={logsContainerRef}
        className="max-h-96 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-white/60 text-center">
            <div>
              <p className="mb-2">No trading logs yet</p>
              <p className="text-xs">Configure and run a bot to see live trading activity</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {reversedLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={cn("px-3 py-2 rounded border border-white/10", getLogStyles(log.level))}
              >
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-xs mt-0.5 uppercase opacity-75">{getLevelBadge(log.level)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-white/80 flex-1">{log.message}</span>
                      <span className="text-white/40 whitespace-nowrap text-xs">{log.timestamp}</span>
                    </div>
                    {log.data && (
                      <div className="mt-2 text-xs space-y-1 opacity-80">
                        {log.data.pair && <div>Pair: <span className="font-semibold">{log.data.pair}</span></div>}
                        {log.data.entry && <div>Entry: <span className="font-semibold">{log.data.entry.toFixed(5)}</span></div>}
                        {log.data.profit !== undefined && (
                          <div className="font-semibold text-emerald-400">
                            Profit: ${log.data.profit.toFixed(2)}
                            {log.data.profitPercentage && ` (+${log.data.profitPercentage.toFixed(2)}%)`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="px-4 sm:px-6 py-2 bg-white/5 border-t border-white/5 text-xs text-white/60">
        <span>Auto-scroll: {isNearTop ? "ON" : "OFF"}</span>
      </div>
    </motion.div>
  ) : (
    /* DESKTOP: Inline Panel */
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isRunning ? <AnimatedLoadingDots /> : <div className="w-2 h-2 rounded-full bg-slate-500" />}
          <span className="font-medium">Trading Logs {isRunning ? "(Running)" : "(Paused)"}</span>
          <span className="text-xs opacity-60">({logs.length})</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onRefreshLogs} disabled={isRunning}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClearLogs}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">No trading logs yet</p>
              <p className="text-xs">Configure and run a bot to see live trading activity</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {reversedLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={cn("px-3 py-2 rounded border border-border", getLogStyles(log.level))}
              >
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-xs mt-0.5 uppercase opacity-75">{getLevelBadge(log.level)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="flex-1">{log.message}</span>
                      <span className="whitespace-nowrap text-xs">{log.timestamp}</span>
                    </div>
                    {log.data && (
                      <div className="mt-2 text-xs space-y-1 opacity-80">
                        {log.data.pair && <div>Pair: <span className="font-semibold">{log.data.pair}</span></div>}
                        {log.data.entry && <div>Entry: <span className="font-semibold">{log.data.entry.toFixed(5)}</span></div>}
                        {log.data.profit !== undefined && (
                          <div className="font-semibold text-emerald-400">
                            Profit: ${log.data.profit.toFixed(2)}
                            {log.data.profitPercentage && ` (+${log.data.profitPercentage.toFixed(2)}%)`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-2 text-xs text-muted-foreground border-t border-border">
        <span>Auto-scroll: {isNearTop ? "ON" : "OFF"}</span>
      </div>
    </div>
  )
}