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
  initiateEliteProMpesa,
  getEliteProPaymentStatus,
  activateElitePro,
  type EliteRunStatus,
} from "@/lib/api"
import {
  Play, Square, RotateCcw, Loader2, Brain, Target,
  TrendingUp, Clock, ShieldCheck, Pause, Download, Sparkles, Crown, Smartphone, CheckCircle2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface EliteRobotInterfaceProps {
  robotName: string
  accountType: string
  onResetToNormal: () => void
}

type Phase =
  | "idle"
  | "enter-code"
  | "running"
  | "paused"
  | "mpesa-form"
  | "mpesa-waiting"
  | "payment-paid"   // admin marked paid — user can download Pro
  | "upgrading-pro"  // download animation
  | "finished"

function extractStatus(res: any): EliteRunStatus | null {
  if (!res) return null
  if (res.data && typeof res.data === "object" && "is_running" in res.data) {
    return res.data as EliteRunStatus
  }
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
  const [isPro, setIsPro] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [isSendingStk, setIsSendingStk] = useState(false)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [amountKes, setAmountKes] = useState<number | null>(null)
  const [proDownloadProgress, setProDownloadProgress] = useState(0)
  const [isActivating, setIsActivating] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const paymentPollRef = useRef<NodeJS.Timeout | null>(null)
  const phaseRef = useRef<Phase>("idle")

  const setPhaseSafe = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (paymentPollRef.current) clearInterval(paymentPollRef.current)
    }
  }, [])

  useEffect(() => {
    const checkCurrentStatus = async () => {
      try {
        const res = await getEliteStatus(accountType)
        const data = extractStatus(res)

        if (data?.is_pro) setIsPro(true)

        if (data?.is_running && data?.is_paused) {
          setStatus(data)
          setPhaseSafe("paused")
          startPolling()
        } else if (data?.is_running) {
          setStatus(data)
          setPhaseSafe("running")
          startPolling()
        } else if (
          data?.target_reached ||
          (Number(data?.current_profit) > 0 && !data?.is_running)
        ) {
          setStatus(data)
          setPhaseSafe("finished")
        } else {
          setPhaseSafe("idle")
        }
      } catch (e) {
        console.error("Failed to restore elite status", e)
        setPhaseSafe("idle")
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
        if (data.is_pro) setIsPro(true)

        if (data.target_reached) {
          setPhaseSafe("finished")
          if (pollRef.current) clearInterval(pollRef.current)
          toast.success(`🎯 Target reached! +$${data.current_profit}`)
          window.dispatchEvent(new Event("session-updated"))
          return
        }

        const current = phaseRef.current
        const inUserFlow =
          current === "mpesa-form" ||
          current === "mpesa-waiting" ||
          current === "payment-paid" ||
          current === "upgrading-pro"

        if (inUserFlow) return

        if (data.is_running && data.is_paused) {
          setPhaseSafe("paused")
        } else if (data.is_running && !data.is_paused) {
          setPhaseSafe("running")
        } else if (!data.is_running) {
          setPhaseSafe(
            Number(data.current_profit) > 0 || data.target_reached
              ? "finished"
              : "idle"
          )
          if (pollRef.current) clearInterval(pollRef.current)
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
      setPhaseSafe("running")
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
      setPhaseSafe("idle")
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
      setPhaseSafe("idle")
      setStatus(null)
      setCode("")
      toast.success("Robot reset. You can configure and run again.")
    } catch (e) {
      toast.error("Reset failed")
    }
  }

  const openMpesaForm = () => {
    setMpesaPhone("")
    setPhaseSafe("mpesa-form")
  }

  const handleSendStk = async () => {
    if (!mpesaPhone.trim()) {
      toast.error("Enter your M-Pesa number")
      return
    }
    setIsSendingStk(true)
    try {
      const res = await initiateEliteProMpesa(mpesaPhone.trim())
      if (res.error || !res.data) {
        throw new Error(res.error || "Failed to initiate M-Pesa payment")
      }

      const data = res.data
      setPaymentId(data.payment_id)
      setAmountKes(data.amount_kes)
      setPhaseSafe("mpesa-waiting")
      toast.success("STK Push sent! Enter your M-Pesa PIN on your phone.")

      // Poll until admin marks payment as paid (status === success)
      if (paymentPollRef.current) clearInterval(paymentPollRef.current)
      paymentPollRef.current = setInterval(async () => {
        try {
          const st = await getEliteProPaymentStatus(data.payment_id)
          if (st.error || !st.data) return

          const s = st.data
          if (s.status === "success") {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current)
            // Do NOT auto-download — show paid screen with Download button
            setPhaseSafe("payment-paid")
            toast.success("Payment confirmed by admin!")
          } else if (s.status === "failed" || s.status === "cancelled") {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current)
            toast.error(s.result_desc || "Payment failed or cancelled")
            setPhaseSafe("paused")
          }
        } catch (e) {
          console.error("Payment poll error", e)
        }
      }, 3000)
    } catch (err: any) {
      toast.error(err.message || "Failed to send STK Push")
    } finally {
      setIsSendingStk(false)
    }
  }

  /** User clicks Download Elite Pro files */
  const handleDownloadPro = async () => {
    if (!paymentId) {
      toast.error("No payment found")
      return
    }
    setPhaseSafe("upgrading-pro")
    setProDownloadProgress(0)
    setIsActivating(true)

    const steps = [12, 28, 45, 62, 78, 90, 100]
    for (const pct of steps) {
      await new Promise((r) => setTimeout(r, 550))
      setProDownloadProgress(pct)
    }

    try {
      // Backend sets is_pro=True — does NOT resume (admin resumes later)
      const res = await activateElitePro(paymentId)
      if (res.error) throw new Error(res.error)

      setIsPro(true)
      toast.success("Elite Pro activated! Waiting for admin to resume your run.")
      // Stay paused until admin resumes
      setPhaseSafe("paused")
      startPolling()
      window.dispatchEvent(new Event("session-updated"))
    } catch (err: any) {
      toast.error(err.message || "Failed to activate Elite Pro")
      setPhaseSafe("payment-paid")
    } finally {
      setIsActivating(false)
    }
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}h ${m}m ${s}s`
  }

  const theme = isPro
    ? {
        border: "border-violet-500/40",
        bg: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)",
        accent: "text-violet-300",
        accentIcon: "text-violet-400",
        badge: "bg-violet-500/25 text-violet-200",
        progress: "from-violet-500 to-cyan-400",
        glow: "bg-violet-500/20 border-violet-400/40",
        pulse: "text-violet-400",
      }
    : {
        border: "border-amber-500/30",
        bg: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(234,88,12,0.05) 100%)",
        accent: "text-amber-300",
        accentIcon: "text-amber-400",
        badge: "bg-amber-500/25 text-amber-300",
        progress: "from-amber-500 to-orange-500",
        glow: "bg-amber-500/20 border-amber-400/40",
        pulse: "text-amber-400",
      }

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
      className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden border ${theme.border}`}
      style={{
        background: theme.bg,
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {isPro ? (
              <Crown className={`w-6 h-6 ${theme.accentIcon}`} />
            ) : (
              <ShieldCheck className={`w-6 h-6 ${theme.accentIcon}`} />
            )}
            <h2 className={`text-xl sm:text-2xl font-bold ${theme.accent}`}>{robotName}</h2>
            {isPro && (
              <span className={`text-xs ${theme.badge} px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1`}>
                <Sparkles className="w-3 h-3" /> ELITE PRO
              </span>
            )}
            {(phase === "paused" || phase === "payment-paid" || phase === "mpesa-waiting") && (
              <span className="text-xs bg-orange-500/25 text-orange-300 px-2.5 py-0.5 rounded-full font-semibold">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-1">
            {isPro ? "Elite Pro Autonomous Trading Engine" : "Elite Autonomous Trading Engine"}
          </p>
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
              onClick={() => setPhaseSafe("enter-code")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-10 py-6 text-lg rounded-2xl"
            >
              <Play className="w-5 h-5 mr-2" />
              Run Elite Robot
            </Button>
          </motion.div>
        )}

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
                onClick={() => setPhaseSafe("idle")}
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
                  className={`w-24 h-24 rounded-full ${theme.glow} border flex items-center justify-center`}
                >
                  <Brain className={`w-10 h-10 ${theme.pulse}`} />
                </motion.div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <motion.p
                  key={status.status_message}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-medium px-4 ${isPro ? "text-violet-200/90" : "text-amber-200/90"}`}
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
                <p className={`text-2xl font-bold ${theme.accent}`}>
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
                className={`h-full bg-gradient-to-r ${theme.progress}`}
                initial={{ width: 0 }}
                animate={{ width: `${status.progress_percent || 0}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            {status.last_entry && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-sm">
                <span className="text-white/50">Last entry: </span>
                <span className={`font-medium ${isPro ? "text-violet-200" : "text-amber-200"}`}>{status.last_entry}</span>
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

        {phase === "paused" && status && (
          <motion.div
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="relative h-32 rounded-2xl overflow-hidden bg-black/40 border border-orange-500/30 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-orange-500/15 border border-orange-400/40 flex items-center justify-center">
                  <Pause className="w-10 h-10 text-orange-400" />
                </div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-sm text-orange-200/90 font-medium px-4">
                  {status.status_message || "Paused by admin"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-center">
              <p className="text-sm text-orange-200 font-medium">
                Trading is temporarily paused by an administrator.
              </p>
              <p className="text-xs text-white/50 mt-1">
                {isPro
                  ? "Elite Pro is active. Admin will resume your run when ready."
                  : "Progress and profit are frozen. Pay for Elite Pro or wait for admin to resume."}
              </p>
            </div>

            {!isPro && (
              <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-violet-300" />
                  <h4 className="font-bold text-violet-200">Unlock Elite Pro</h4>
                </div>
                <p className="text-sm text-white/60">
                  Pay <span className="text-violet-300 font-semibold">$1,500</span> via M-Pesa.
                  After admin confirms payment, you can download Elite Pro profiles.
                  Admin will resume your run when ready.
                </p>
                <Button
                  onClick={openMpesaForm}
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Upgrade to Elite Pro via M-Pesa
                </Button>
              </div>
            )}

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
                <p className={`text-2xl font-bold ${theme.accent}`}>
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
              <div
                className={`h-full bg-gradient-to-r ${isPro ? "from-violet-500 to-cyan-400" : "from-orange-500 to-amber-500"} opacity-70`}
                style={{ width: `${status.progress_percent || 0}%` }}
              />
            </div>

            {status.last_entry && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-sm">
                <span className="text-white/50">Last entry: </span>
                <span className={`font-medium ${isPro ? "text-violet-200" : "text-amber-200"}`}>{status.last_entry}</span>
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

        {phase === "mpesa-form" && (
          <motion.div
            key="mpesa-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5 py-4 max-w-md mx-auto"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 border border-violet-500/40 mb-3">
                <Smartphone className="w-8 h-8 text-violet-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Pay with M-Pesa</h3>
              <p className="text-sm text-white/50">
                Elite Pro — <span className="text-violet-300 font-semibold">$1,500 USD</span>
                <span className="text-white/40"> (converted to KES)</span>
              </p>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1.5 block">M-Pesa Phone Number</label>
              <Input
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="text-center text-lg tracking-wider bg-black/40 border-violet-500/40 text-white h-14"
                inputMode="tel"
                autoFocus
              />
              <p className="text-[10px] text-white/40 mt-1.5 text-center">
                You will receive an STK Push. Enter your M-Pesa PIN. Admin will confirm payment.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPhaseSafe("paused")}
                className="flex-1 border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendStk}
                disabled={isSendingStk}
                className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold"
              >
                {isSendingStk ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Smartphone className="w-4 h-4 mr-2" />
                )}
                {isSendingStk ? "Sending…" : "Pay with M-Pesa"}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "mpesa-waiting" && (
          <motion.div
            key="mpesa-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 py-8 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/20 border border-violet-500/40"
            >
              <Smartphone className="w-10 h-10 text-violet-300" />
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-violet-200 mb-2">Payment in progress</h3>
              <p className="text-sm text-white/60 max-w-sm mx-auto">
                STK Push sent
                {amountKes != null ? (
                  <> for <span className="text-violet-300 font-semibold">KES {amountKes.toLocaleString()}</span></>
                ) : null}
                . Complete PIN on your phone, then wait for admin to confirm payment.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for admin confirmation…
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (paymentPollRef.current) clearInterval(paymentPollRef.current)
                setPhaseSafe("paused")
              }}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {/* ADMIN MARKED PAID → show Download button */}
        {phase === "payment-paid" && (
          <motion.div
            key="payment-paid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 py-6 text-center max-w-md mx-auto"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-300 mb-2">Payment confirmed</h3>
              <p className="text-sm text-white/60">
                Traderiserapp has marked your Elite Pro payment as paid.
                Download the Elite Pro profiles to activate advanced features.
              </p>
            </div>
            <Button
              onClick={handleDownloadPro}
              disabled={isActivating}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold py-6 text-base"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Elite Pro Files
            </Button>
            <p className="text-xs text-white/40">
              After download, all active trades will resume automatically.
            </p>
          </motion.div>
        )}

        {phase === "upgrading-pro" && (
          <motion.div
            key="upgrading-pro"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 py-6"
          >
            <div className="relative h-40 rounded-2xl overflow-hidden bg-black/50 border border-violet-500/30 flex flex-col items-center justify-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full border-2 border-violet-400/40 border-t-violet-400 flex items-center justify-center"
              >
                <Download className="w-7 h-7 text-violet-300" />
              </motion.div>
              <div className="text-center px-4">
                <p className="text-violet-200 font-semibold text-sm">
                  {proDownloadProgress < 100 ? "Downloading Elite Pro profiles…" : "Elite Pro ready!"}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {proDownloadProgress < 30 && "Connecting to Elite Pro servers…"}
                  {proDownloadProgress >= 30 && proDownloadProgress < 50 && "Installing market profiles…"}
                  {proDownloadProgress >= 50 && proDownloadProgress < 70 && "Loading advanced strategies…"}
                  {proDownloadProgress >= 70 && proDownloadProgress < 90 && "Calibrating risk engine…"}
                  {proDownloadProgress >= 90 && proDownloadProgress < 100 && "Finalizing Pro package…"}
                  {proDownloadProgress >= 100 && "Activating Elite Pro…"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50">
                <span>Download progress</span>
                <span>{proDownloadProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${proDownloadProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}

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
