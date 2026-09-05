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
import { Copy, Check, Settings, Mail, Loader2 } from "lucide-react"

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
  const [stake, setStake] = useState("100")
  const [targetProfit, setTargetProfit] = useState("500")
  const [targetMarket, setTargetMarket] = useState("XAUUSD")
  const [customMarket, setCustomMarket] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getEliteConfig()
        if (res?.data?.config) {
          const c = res.data.config
          setTimeframe(c.timeframe || "5m")
          setStake(String(c.stake || 100))
          setTargetProfit(String(c.target_profit || 500))
          setTargetMarket(c.target_market || "XAUUSD")
          if (c.config_code) setLastCode(c.config_code)
        }
      } catch (e) {
        // no config yet – fine
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    const stakeNum = Number(stake)
    const profitNum = Number(targetProfit)
    const market = customMarket.trim() || targetMarket

    if (stakeNum < 100) {
      toast.error("Minimum stake is $100")
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

      if (res?.data?.email_sent !== false) {
        toast.success("Configuration saved!", {
          description: "Check your email for the configuration code.",
        })
      } else {
        toast.success("Configuration saved!", {
          description: `Code: ${code} (email failed – copy it now)`,
        })
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration")
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

  return (
    <div className="mt-6 p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-600/5">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-amber-400" />
        <h4 className="font-bold text-amber-300">Elite Robot Configuration</h4>
      </div>

      <p className="text-xs text-white/50 mb-5">
        Configure how <span className="text-amber-300 font-medium">{robotName}</span> will trade autonomously.
        After saving you will receive a one-time code by email.
      </p>

      <div className="space-y-4">
        {/* Market */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Target Market</label>
          <Select value={targetMarket} onValueChange={(v) => { setTargetMarket(v); setCustomMarket("") }}>
            <SelectTrigger className="bg-black/40 border-white/15 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_MARKETS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
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
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stake */}
        <div>
          <label className="text-xs text-white/60 mb-1 block">Stake (min $100)</label>
          <Input
            type="number"
            min={100}
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
          <p className="text-[10px] text-white/40 mt-1">
            ≤ $600 → ~1 h &nbsp;|&nbsp; $1k–$5k → ≤ 2 h &nbsp;|&nbsp; &gt; $5k → ≥ 6 h
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold"
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
          <div className="mt-4 p-3 rounded-xl bg-black/50 border border-amber-500/30">
            <p className="text-xs text-amber-400 mb-1">Latest Configuration Code</p>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="flex-1 select-all">{lastCode}</span>
              <button onClick={copyCode} className="text-amber-400 hover:text-amber-300">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              Also sent to your email. Valid 24 h. Use it on the Trading page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}