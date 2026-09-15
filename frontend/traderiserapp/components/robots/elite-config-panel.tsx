// components/robots/elite-config-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  getEliteConfig,
  saveEliteConfig,
} from "@/lib/api"
import { Copy, Check, Settings, Mail, Loader2, Crown } from "lucide-react"

interface EliteConfigPanelProps {
  robotId: number
  robotName: string
}

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h"]
const POPULAR_MARKETS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "EURJPY",
  "BTCUSD", "ETHUSD", "NAS100", "US30", "XAGUSD"
]

export function EliteConfigPanel({ robotId, robotName }: EliteConfigPanelProps) {
  const [timeframe, setTimeframe] = useState("5m")
  const [stake, setStake] = useState("1000")
  const [targetProfit, setTargetProfit] = useState("500")
  const [targetMarket, setTargetMarket] = useState("XAUUSD")
  const [customMarket, setCustomMarket] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getEliteConfig()
        if (res?.data?.config) {
          const c = res.data.config
          setTimeframe(c.timeframe || "5m")
          setStake(String(c.stake || 1000))
          setTargetProfit(String(c.target_profit || 500))
          setTargetMarket(c.target_market || "XAUUSD")
          if (c.config_code) setLastCode(c.config_code)
          setIsPro(Boolean(c.is_pro))
        }
      } catch {
        // no config yet – fine
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    const stakeNum = Number(stake)
    const profitNum = Number(targetProfit)
    const market = customMarket.trim() || targetMarket

    if (stakeNum < 1000) {
      toast.error("Minimum stake is $1000")
      return
    }
    if (profitNum < 50) {
      toast.error("Minimum target profit is $50")
      return
    }
    if (!market) {
      toast.error("Please select or enter a target market")
      return
    }

    setIsSaving(true)
    try {
      const res = await saveEliteConfig({
        timeframe,
        stake: stakeNum,
        target_profit: profitNum,
        target_market: market.toUpperCase(),
      })

      if (res?.error) throw new Error(res.error)

      const code = res?.data?.config_code
      if (code) setLastCode(code)
      if (res?.data?.config?.is_pro != null) {
        setIsPro(Boolean(res.data.config.is_pro))
      }

      if (res?.data?.email_sent !== false) {
        toast.success("Configuration saved!", {
          description: "Check your email for the configuration code.",
        })
      } else {
        toast.success("Configuration saved!", {
          description: `Code: ${code} (email failed – copy it now)`,
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration"
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const copyCode = () => {
    if (!lastCode) return
    navigator.clipboard.writeText(lastCode)
    setCopied(true)
    toast.success("Code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  // Theme: Elite (amber) vs Elite Pro (violet / cyan)
  const theme = isPro
    ? {
        panel:
          "border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-cyan-600/10",
        title: "text-violet-200",
        icon: "text-violet-300",
        accent: "text-violet-300",
        badge:
          "bg-violet-500/20 text-violet-200 border border-violet-400/40",
        button:
          "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-400",
        codeBox:
          "bg-black/50 border border-violet-500/40",
        codeLabel: "text-violet-300",
        codeBtn: "text-violet-300 hover:text-cyan-300",
        hint: "text-white/40",
      }
    : {
        panel:
          "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-600/5",
        title: "text-amber-300",
        icon: "text-amber-400",
        accent: "text-amber-300",
        badge:
          "bg-amber-500/15 text-amber-200 border border-amber-400/30",
        button:
          "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
        codeBox:
          "bg-black/50 border border-amber-500/30",
        codeLabel: "text-amber-400",
        codeBtn: "text-amber-400 hover:text-amber-300",
        hint: "text-white/40",
      }

  return (
    <div className={`mt-6 p-5 rounded-2xl border ${theme.panel}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {isPro ? (
            <Crown className={`w-5 h-5 ${theme.icon}`} />
          ) : (
            <Settings className={`w-5 h-5 ${theme.icon}`} />
          )}
          <h4 className={`font-bold ${theme.title}`}>
            {isPro ? "Elite Pro Configuration" : "Elite Robot Configuration"}
          </h4>
        </div>
        {isPro && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}
          >
            PRO
          </span>
        )}
      </div>

      <p className="text-xs text-white/50 mb-5">
        Configure how{" "}
        <span className={`${theme.accent} font-medium`}>
          {isPro ? `${robotName} Pro` : robotName}
        </span>{" "}
        will trade autonomously.
        {isPro
          ? " Pro profiles are active on this account."
          : " After saving you will receive a one-time code by email."}
      </p>

      <div className="space-y-4">
        {/* Market */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Target Market</label>
          <Select
            value={targetMarket}
            onValueChange={(v) => {
              setTargetMarket(v)
              setCustomMarket("")
            }}
          >
            <SelectTrigger className="bg-black/40 border-white/15 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_MARKETS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
              <SelectItem value="CUSTOM">Custom…</SelectItem>
            </SelectContent>
          </Select>
          {targetMarket === "CUSTOM" && (
            <Input
              className="mt-2 bg-black/40 border-white/15 text-white"
              placeholder="e.g. AUDNZD"
              value={customMarket}
              onChange={(e) => setCustomMarket(e.target.value.toUpperCase())}
            />
          )}
        </div>

        {/* Timeframe */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Timeframe</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="bg-black/40 border-white/15 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stake */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Stake (min $1000)</label>
          <Input
            type="number"
            min={1000}
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="bg-black/40 border-white/15 text-white"
          />
        </div>

        {/* Target Profit */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Target Profit (USD)</label>
          <Input
            type="number"
            min={50}
            value={targetProfit}
            onChange={(e) => setTargetProfit(e.target.value)}
            className="bg-black/40 border-white/15 text-white"
          />
          <p className={`text-[10px] mt-1 ${theme.hint}`}>
            ≤ $600 → ~1 h &nbsp;|&nbsp; $1k–$5k → ≤ 2 h &nbsp;|&nbsp; &gt; $5k → ≥ 6 h
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full text-white font-bold ${theme.button}`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving & sending code…
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Save Settings & Send Code to Email
            </>
          )}
        </Button>

        {lastCode && (
          <div className={`mt-4 p-3 rounded-xl ${theme.codeBox}`}>
            <p className={`text-xs mb-1 ${theme.codeLabel}`}>Latest Configuration Code</p>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="flex-1 select-all">{lastCode}</span>
              <button onClick={copyCode} className={theme.codeBtn}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className={`text-[10px] mt-1 ${theme.hint}`}>
              Also sent to your email. Valid 24 h. Use it on the Trading page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
