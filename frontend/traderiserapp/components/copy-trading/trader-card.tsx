"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle2,
  Users,
  TrendingUp,
  Shield,
  DollarSign,
  Clock,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useState } from "react"
import { createCopySubscription } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface TraderCardProps {
  trader: {
    id: number
    username?: string
    bio: string
    risk_level: string
    win_rate: number
    average_return: number
    subscriber_count: number
    min_allocation: number
    max_allocation?: number
    performance_fee_percent: number
    is_verified?: boolean
  }
}

export function TraderCard({ trader }: TraderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const maxAlloc = Number(trader.max_allocation) || 1000
  const minAlloc = Number(trader.min_allocation) || 10
  const [allocation, setAllocation] = useState(minAlloc)
  const [maxDrawdown, setMaxDrawdown] = useState([20])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const displayName = trader.username || `Trader #${trader.id}`
  const avatarFallback = trader.username
    ? trader.username.substring(0, 2).toUpperCase()
    : `T${trader.id}`

  const riskColor =
    trader.risk_level === "low"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : trader.risk_level === "medium"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-rose-400 bg-rose-400/10 border-rose-400/20"

  const winRate = Number(trader.win_rate) || 0
  const avgReturn = Number(trader.average_return) || 0
  const subCount = Number(trader.subscriber_count) || 0
  const perfFee = Number(trader.performance_fee_percent) || 0

  const handleStartCopying = async () => {
    setIsSubmitting(true)

    const activeAccountId = localStorage.getItem("active_account_id")
    const accountId = activeAccountId ? Number.parseInt(activeAccountId, 10) : null

    if (!accountId) {
      toast({
        title: "Error",
        description: "No account found. Please switch to a real account.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (allocation < minAlloc) {
      toast({
        title: "Invalid Amount",
        description: `Minimum allocation is $${minAlloc}`,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }
    if (allocation > maxAlloc) {
      toast({
        title: "Invalid Amount",
        description: `Maximum allocation is $${maxAlloc}`,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    const result = await createCopySubscription({
      trader: trader.id,
      account: accountId,
      allocated_amount: allocation,
      max_drawdown_percent: maxDrawdown[0],
    })

    setIsSubmitting(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Success!", description: `You are now copying ${displayName}` })
      setExpanded(false)
    }
  }

  return (
    <Card
      className={`glass-card w-full min-w-0 hover:border-pink-500/30 transition-all duration-300 group overflow-hidden flex flex-col border-white/10 ${
        expanded
          ? "border-pink-500/40 shadow-lg shadow-pink-500/10 col-span-full sm:col-span-2 xl:col-span-3 2xl:col-span-4"
          : "h-full"
      }`}
    >
      <CardContent className="p-4 sm:p-6 space-y-4 flex-1">
        {/* Header: Avatar and Username */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-1 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex-shrink-0">
              <Avatar
                className={`border-2 border-black ${expanded ? "w-14 h-14 sm:w-16 sm:h-16" : "w-12 h-12"}`}
              >
                <AvatarImage src={`/.jpg?height=48&width=48&query=${displayName}`} />
                <AvatarFallback className="bg-slate-800 text-white font-bold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3
                  className={`font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1 ${
                    expanded ? "text-xl sm:text-2xl" : "text-lg"
                  }`}
                >
                  {displayName}
                </h3>
                {trader.is_verified && (
                  <CheckCircle2 size={expanded ? 18 : 16} className="text-blue-400 flex-shrink-0" />
                )}
              </div>
              <Badge variant="outline" className={`mt-1 capitalize text-xs px-2 py-0.5 ${riskColor}`}>
                {trader.risk_level} Risk
              </Badge>
            </div>
          </div>
          {expanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
              className="flex-shrink-0 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronUp size={18} />
              <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Collapse</span>
            </Button>
          )}
        </div>

        {/* Bio */}
        <p className={`text-sm text-white/80 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {trader.bio}
        </p>

        {/* Compact stats (always visible when collapsed) */}
        {!expanded && (
          <>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                <p className="text-xs text-white/70 uppercase font-semibold flex items-center gap-1">
                  <TrendingUp size={12} className="text-pink-500" /> Win Rate
                </p>
                <p className="text-xl font-bold text-pink-400">{winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                <p className="text-xs text-white/70 uppercase font-semibold flex items-center gap-1">
                  <Shield size={12} className="text-blue-400" /> Avg Return
                </p>
                <p className="text-xl font-bold text-blue-400">+{avgReturn.toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                <DollarSign size={14} />
                <span>Allocation Range</span>
              </div>
              <div className="text-sm font-medium text-white">
                ${minAlloc} — ${maxAlloc}
              </div>
            </div>

            {/* Equity Sparkline */}
            <div className="h-12 w-full flex items-end gap-[2px] pt-2 opacity-70">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-pink-500/60 to-pink-500/90 rounded-t-sm"
                  style={{ height: `${30 + Math.sin(i / 3) * 50 + Math.random() * 20}%` }}
                />
              ))}
            </div>
          </>
        )}

        {/* Expanded full details */}
        {expanded && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Full stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-pink-400">
                  <TrendingUp size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Win Rate
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400">
                  <Shield size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Avg Return
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-400">+{avgReturn.toFixed(1)}%</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Users size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Subscribers
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{subCount.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Clock size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Min Alloc
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">${minAlloc}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400">
                  <Calendar size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Max Alloc
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">${maxAlloc}</p>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400">
                  <Shield size={16} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold">
                    Fee
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{perfFee}%</p>
              </div>
            </div>

            {/* Equity Growth Chart */}
            <div className="bg-white/5 p-4 sm:p-6 rounded-xl border border-white/10 space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={18} className="text-pink-500" />
                Equity Growth
              </h3>
              <div className="h-28 sm:h-36 flex items-end gap-[2px] sm:gap-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-pink-500/30 to-pink-500/70 rounded-t-sm"
                    style={{ height: `${30 + Math.sin(i / 5) * 30 + Math.random() * 20}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Start Copying Form */}
            <div className="bg-white/5 p-4 sm:p-6 rounded-xl border border-pink-500/20 space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-gradient-pink">Start Copying</h3>
                <p className="text-sm text-white/50">
                  Set your parameters and automatically mirror this trader&apos;s signals
                </p>
              </div>

              {/* Allocation Amount */}
              <div className="space-y-3">
                <Label htmlFor={`allocation-${trader.id}`} className="text-white/80">
                  Allocation Amount (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <Input
                    id={`allocation-${trader.id}`}
                    type="number"
                    inputMode="decimal"
                    min={minAlloc}
                    max={maxAlloc}
                    value={allocation}
                    onChange={(e) => setAllocation(Number(e.target.value))}
                    className="pl-8 h-11 text-base bg-black/40 border-white/10 focus:ring-pink-500/50"
                  />
                </div>
                <p className="text-xs text-white/40">
                  Range: ${minAlloc} — ${maxAlloc}
                </p>
              </div>

              {/* Max Drawdown Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`drawdown-${trader.id}`} className="text-white/80">
                    Max Drawdown
                  </Label>
                  <span className="text-sm font-bold text-pink-400">{maxDrawdown[0]}%</span>
                </div>
                <Slider
                  id={`drawdown-${trader.id}`}
                  value={maxDrawdown}
                  onValueChange={setMaxDrawdown}
                  min={5}
                  max={50}
                  step={5}
                  className="[&_[role=slider]]:bg-pink-500 [&_[role=slider]]:border-pink-600"
                />
                <p className="text-xs text-white/40">Auto-pause if losses exceed this threshold</p>
              </div>

              {/* Performance Fee Notice */}
              <Alert className="bg-pink-500/10 border-pink-500/20">
                <AlertDescription className="text-xs text-white/70">
                  This trader charges a <strong>{perfFee}%</strong> performance fee on profits. Fees
                  are deducted automatically from winning trades.
                </AlertDescription>
              </Alert>

              {/* CTA Button */}
              <Button
                onClick={handleStartCopying}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 h-12 font-semibold text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Start Copying Now"}
              </Button>

              {/* Risk Warning */}
              <Alert className="bg-rose-500/10 border-rose-500/20">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertDescription className="text-xs text-white/70">
                  Copy trading involves significant risk. Past performance does not guarantee future
                  results.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </CardContent>

      {!expanded && (
        <CardFooter className="p-4 sm:p-6 pt-0 mt-auto">
          <div className="w-full space-y-4">
            {/* Subscribers & Fee */}
            <div className="flex items-center justify-between w-full text-sm text-white/80 font-medium">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="flex-shrink-0" />
                {subCount.toLocaleString()} Subscribers
              </span>
              <span>Fee: {perfFee}%</span>
            </div>

            {/* Expand / View Profile Button */}
            <Button
              onClick={() => setExpanded(true)}
              className="w-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600 hover:to-purple-600 backdrop-blur-sm border border-white/20 hover:border-pink-500 text-white font-semibold rounded-xl transition-all duration-300 py-5 sm:py-6 text-sm sm:text-base shadow-lg hover:shadow-pink-500/30 gap-2"
            >
              <span className="hidden sm:inline">View Full Profile & Copy</span>
              <span className="sm:hidden">View Profile</span>
              <ChevronDown size={16} />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
