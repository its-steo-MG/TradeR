// components/robots/elite-config-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getEliteConfig, saveEliteConfig } from "@/lib/api"
import { Copy, Check, Settings, Mail, Loader2, Crown } from "lucide-react"

interface EliteConfigPanelProps {
  robotId: number
  robotName: string
}

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h"]
const POPULAR_MARKETS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "EURJPY",
  "BTCUSD", "ETHUSD", "NAS100", "US30", "XAGUSD",
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
        // no config yet
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    const stakeNum = Number(stake)
    const profitNum = Number(targetProfit)
    const market = customMarket.trim() || targetMarket

    if (stakeNum < 1000) return toast.error("Minimum stake is $1000")
    if (profitNum < 50) return toast.error("Minimum target profit is $50")
    if (!market) return toast.error("Please select or enter a target market")

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
      if (res?.data?.config?.is_pro != null) setIsPro(Boolean(res.data.config.is_pro))
      toast.success("Configuration saved!", {
        description: res?.data?.email_sent !== false ? "Check your email for the configuration code." : `Code: ${code}`,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration")
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

  const field = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
  const panel = isPro
    ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950"
    : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950"
  const title = isPro ? "text-violet-800 dark:text-violet-200" : "text-amber-800 dark:text-amber-200"
  const accent = isPro ? "text-violet-700 dark:text-violet-300" : "text-amber-700 dark:text-amber-300"

  return (
    <div className={`mt-6 p-5 rounded-2xl border ${panel}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {isPro ? <Crown className={`w-5 h-5 ${accent}`} /> : <Settings className={`w-5 h-5 ${accent}`} />}
          <h4 className={`font-bold ${title}`}>{isPro ? "Elite Pro Configuration" : "Elite Robot Configuration"}</h4>
        </div>
        {isPro && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-200 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
            PRO
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 dark:text-zinc-400 mb-5">
        Configure how <span className={`${accent} font-medium`}>{isPro ? `${robotName} Pro` : robotName}</span> will trade autonomously.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-600 dark:text-zinc-400 mb-1 block">Target Market</label>
          <Select value={targetMarket} onValueChange={(v) => { setTargetMarket(v); setCustomMarket("") }}>
            <SelectTrigger className={field}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
              {POPULAR_MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              <SelectItem value="CUSTOM">Custom…</SelectItem>
            </SelectContent>
          </Select>
          {targetMarket === "CUSTOM" && (
            <Input className={`mt-2 ${field}`} placeholder="e.g. AUDNZD" value={customMarket} onChange={(e) => setCustomMarket(e.target.value.toUpperCase())} />
          )}
        </div>

        <div>
          <label className="text-xs text-slate-600 dark:text-zinc-400 mb-1 block">Timeframe</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className={field}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
              {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-slate-600 dark:text-zinc-400 mb-1 block">Stake (min $1000)</label>
          <Input type="number" min={1000} value={stake} onChange={(e) => setStake(e.target.value)} className={field} />
        </div>

        <div>
          <label className="text-xs text-slate-600 dark:text-zinc-400 mb-1 block">Target Profit (USD)</label>
          <Input type="number" min={50} value={targetProfit} onChange={(e) => setTargetProfit(e.target.value)} className={field} />
          <p className="text-[10px] mt-1 text-slate-500 dark:text-zinc-500">{"≤ $600 → ~1 h | $1k–$5k → ≤ 2 h | > $5k → ≥ 6 h"}</p>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className={`w-full text-white font-bold ${isPro ? "bg-gradient-to-r from-violet-600 to-cyan-500" : "bg-gradient-to-r from-amber-500 to-orange-600"}`}>
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving & sending code…</> : <><Mail className="w-4 h-4 mr-2" />Save Settings & Send Code to Email</>}
        </Button>

        {lastCode && (
          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700">
            <p className={`text-xs mb-1 ${accent}`}>Latest Configuration Code</p>
            <div className="flex items-center gap-2 font-mono text-sm text-slate-900 dark:text-white">
              <span className="flex-1 select-all">{lastCode}</span>
              <button onClick={copyCode} className={accent}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            </div>
            <p className="text-[10px] mt-1 text-slate-500 dark:text-zinc-500">Also sent to your email. Valid 24 h.</p>
          </div>
        )}
      </div>
    </div>
  )
}
