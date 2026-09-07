// components/trading/elite-robot-interface.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  validateEliteCode,
  startEliteRun,
  getEliteStatus,
  resetEliteRun,
  stopEliteRun,
  type EliteRunStatus,
} from "@/lib/api"
import {
  Play, Square, RotateCcw, Loader2, Brain, Target,
  TrendingUp, Clock, ShieldCheck
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface EliteRobotInterfaceProps {
  robotName: string
  accountType: string
  onResetToNormal: () => void
}

type Phase = "idle" | "enter-code" | "running" | "finished"

/** Safely extract EliteRunStatus from ApiResponse or raw object */
function extractStatus(res: any): EliteRunStatus | null {
  if (!res) return null
  // Normal shape from apiRequest → { data, error, status }
  if (res.data && typeof res.data === "object" && "is_running" in res.data) {
    return res.data as EliteRunStatus
  }
  // Fallback if the helper already returned the raw status
  if (typeof res.is_running === "boolean") {
    return res as EliteRunStatus
  }
  return null
}

export function EliteRobotInterface({
  robotName,
  accountType,
  onResetToNormal,
}: EliteRobotInterfaceProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [code, setCode] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [status, setStatus] = useState<EliteRunStatus | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ========== RESTORE STATE ON LOAD / REFRESH ==========
  useEffect(() => {
    const checkCurrentStatus = async () => {
      try {
        const res = await getEliteStatus(accountType)
        const data = extractStatus(res)

        if (data?.is_running) {
          setStatus(data)
          setPhase("running")
          startPolling()
        } else if (
          data?.target_reached ||
          (Number(data?.current_profit) > 0 && !data?.is_running)
        ) {
          setStatus(data)
          setPhase("finished")
        } else {
          setPhase("idle")
        }
      } catch (e) {
        console.error("Failed to restore elite status", e)
        setPhase("idle")
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkCurrentStatus()
  }, [accountType])

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await getEliteStatus(accountType)
        const data = extractStatus(res)
        if (!data) return

        setStatus(data)

        if (data.target_reached) {
          setPhase("finished")
          if (pollRef.current) clearInterval(pollRef.current)
          toast.success(`🎯 Target reached! +$${data.current_profit}`)
          window.dispatchEvent(new Event("session-updated"))
        }
      } catch (e) {
        console.error("Status poll failed", e)
      }
    }, 4000)
  }

  const handleValidateAndStart = async () => {
    if (!code.trim()) {
      toast.error("Please enter the configuration code")
      return
    }
    setIsValidating(true)
    try {
      const valRes = await validateEliteCode(code.trim().toUpperCase())
      if (valRes?.error || !valRes?.data?.valid) {
        throw new Error(valRes?.error || "Invalid code")
      }

      setIsValidating(false)
      setIsStarting(true)

      const startRes = await startEliteRun(accountType)
      if (startRes?.error) throw new Error(startRes.error)

      const data = extractStatus(startRes)
      setPhase("running")
      setStatus(data)
      startPolling()
      toast.success("Elite robot engine started")
    } catch (err: any) {
      toast.error(err.message || "Failed to start")
    } finally {
      setIsValidating(false)
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    try {
      await stopEliteRun()
      if (pollRef.current) clearInterval(pollRef.current)
      setPhase("idle")
      setStatus(null)
      toast.info("Robot stopped")
    } catch (e) {
      toast.error("Failed to stop")
    }
  }

  const handleReset = async () => {
    try {
      await resetEliteRun()
      if (pollRef.current) clearInterval(pollRef.current)
      setPhase("idle")
      setStatus(null)
      setCode("")
      toast.success("Robot reset. You can configure and run again.")
    } catch (e) {
      toast.error("Reset failed")
    }
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}h ${m}m ${s}s`
  }

  // Show loading while we check if the robot is already running
  if (isCheckingStatus) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-3 text-white/60">Checking robot status…</span>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-amber-500/30"
      style={{
        background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(234,88,12,0.05) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-amber-300">{robotName}</h2>
          </div>
          <p className="text-xs text-white/50 mt-1">Elite Autonomous Trading Engine</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetToNormal}
          className="text-white/50 hover:text-white"
        >
          ← Back to normal
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center space-y-6 py-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40">
              <Brain className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Ready to Launch</h3>
              <p className="text-sm text-white/60 max-w-md mx-auto">
                Make sure you have saved a configuration and received the code by email.
                Click Run to enter the code and start the autonomous engine.
              </p>
            </div>
            <Button
              onClick={() => setPhase("enter-code")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-10 py-6 text-lg rounded-2xl"
            >
              <Play className="w-5 h-5 mr-2" />
              Run Elite Robot
            </Button>
          </motion.div>
        )}

        {/* ENTER CODE */}
        {phase === "enter-code" && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5 py-6 max-w-md mx-auto"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">Enter Configuration Code</h3>
              <p className="text-sm text-white/50">The code was sent to your email after saving settings</p>
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="text-center font-mono text-lg tracking-widest bg-black/40 border-amber-500/40 text-white h-14"
              maxLength={14}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPhase("idle")}
                className="flex-1 border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidateAndStart}
                disabled={isValidating || isStarting}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
              >
                {(isValidating || isStarting) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isValidating ? "Validating…" : isStarting ? "Starting…" : "Start Engine"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* RUNNING */}
        {phase === "running" && status && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="relative h-32 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-24 h-24 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center"
                >
                  <Brain className="w-10 h-10 text-amber-400" />
                </motion.div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <motion.p
                  key={status.status_message}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-amber-200/90 font-medium px-4"
                >
                  {status.status_message || "Studying the market…"}
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Current Profit
                </div>
                <p className="text-2xl font-bold text-green-400">
                  ${Number(status.current_profit || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <Target className="w-3.5 h-3.5" /> Target
                </div>
                <p className="text-2xl font-bold text-amber-300">
                  ${Number(status.target_profit || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Time Remaining
                </div>
                <p className="text-lg font-semibold text-white">
                  {formatTime(status.time_remaining_seconds || 0)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="text-xs text-white/50 mb-1">Progress</div>
                <p className="text-lg font-semibold text-white">
                  {status.progress_percent || 0}%
                </p>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${status.progress_percent || 0}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            {status.last_entry && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-sm">
                <span className="text-white/50">Last entry: </span>
                <span className="text-amber-200 font-medium">{status.last_entry}</span>
              </div>
            )}

            <Button
              onClick={handleStop}
              className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Robot
            </Button>
          </motion.div>
        )}

        {/* FINISHED */}
        {phase === "finished" && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40">
              <Target className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">Target Attained!</h3>
              <p className="text-white/70">
                The Elite robot has reached your target profit of{" "}
                <span className="text-green-300 font-semibold">
                  ${Number(status?.current_profit || 0).toFixed(2)}
                </span>
              </p>
            </div>
            <p className="text-sm text-white/50">
              Click Reset to return the robot to idle state and use it again later.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleReset}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-8"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Robot
              </Button>
              <Button
                variant="outline"
                onClick={onResetToNormal}
                className="border-white/20 text-white"
              >
                Back to normal trading
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}