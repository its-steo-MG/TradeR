"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, TrendingUp, Shield, Users, Clock, Calendar, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createCopySubscription } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface TraderDetailDialogProps {
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TraderDetailDialog({ trader, open, onOpenChange }: TraderDetailDialogProps) {
  const maxAlloc = Number(trader.max_allocation) || 1000
  const [allocation, setAllocation] = useState(trader.min_allocation)
  const [maxDrawdown, setMaxDrawdown] = useState([20])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const displayName = trader.username || `Trader #${trader.id}`
  const avatarFallback = trader.username ? trader.username.substring(0, 2).toUpperCase() : `T${trader.id}`

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

    if (allocation < trader.min_allocation) {
      toast({
        title: "Invalid Amount",
        description: `Minimum allocation is $${trader.min_allocation}`,
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
      onOpenChange(false)
    }
  }

  const riskClass =
    trader.risk_level === "low"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : trader.risk_level === "medium"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-rose-400 bg-rose-400/10 border-rose-400/20"

  const winRate = Number(trader.win_rate) || 0
  const avgReturn = Number(trader.average_return) || 0
  const subCount = Number(trader.subscriber_count) || 0
  const minAlloc = Number(trader.min_allocation) || 0
  const perfFee = Number(trader.performance_fee_percent) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Responsive shell:
        - width capped to the viewport with a gutter on small screens
        - height capped with dvh (correct on mobile browsers with dynamic toolbars)
        - flex column so ONLY the body scrolls -> the CTA is never cut off
      */}
      <DialogContent
        className="
          w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)]
          max-w-5xl
          max-h-[92dvh] sm:max-h-[90dvh]
          p-0 gap-0 overflow-hidden
          flex flex-col
          bg-slate-950/95 backdrop-blur-2xl border-white/10 text-white
          rounded-2xl
        "
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle className="sr-only">Trader Profile Details</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6 lg:gap-8">
            {/* Left Column: Profile & Stats */}
            <div className="space-y-5 sm:space-y-6 min-w-0">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="relative p-1 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex-shrink-0">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-black">
                    <AvatarImage src={`/.jpg?height=80&width=80&query=${displayName}`} />
                    <AvatarFallback className="bg-slate-800 text-white font-bold text-lg sm:text-xl">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-bold truncate">{displayName}</h2>
                    {trader.is_verified && <CheckCircle2 size={20} className="text-blue-400 flex-shrink-0" />}
                  </div>
                  <Badge variant="outline" className={`capitalize ${riskClass}`}>
                    {trader.risk_level} Risk
                  </Badge>
                  <p className="text-sm sm:text-base text-white/60 leading-relaxed break-words">{trader.bio}</p>
                </div>
              </div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-pink-400">
                    <TrendingUp size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Win Rate</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{winRate.toFixed(1)}%</p>
                </div>
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Shield size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Avg Return</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-400">+{avgReturn.toFixed(1)}%</p>
                </div>
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Users size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Subscribers</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{subCount}</p>
                </div>
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Clock size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Min Alloc</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">${minAlloc}</p>
                </div>
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Calendar size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Max Alloc</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">${maxAlloc}</p>
                </div>
                <div className="glass-card p-3 sm:p-4 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Shield size={16} className="flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold truncate">Fee</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{perfFee}%</p>
                </div>
              </div>

              {/* Equity Growth Chart */}
              <div className="glass-card p-4 sm:p-6 space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <TrendingUp size={18} className="text-pink-500" />
                  Equity Growth
                </h3>
                <div className="h-32 sm:h-40 lg:h-48 flex items-end gap-[2px] sm:gap-1">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-pink-500/30 to-pink-500/70 rounded-t-sm"
                      style={{ height: `${30 + Math.sin(i / 5) * 30 + Math.random() * 20}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Start Copying Form (sticky only on large screens) */}
            <div className="min-w-0">
              <div className="glass-card p-4 sm:p-6 space-y-5 sm:space-y-6 lg:sticky lg:top-0">
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-gradient-pink">Start Copying</h3>
                  <p className="text-sm text-white/50">
                    Set your parameters and automatically mirror this trader&apos;s signals
                  </p>
                </div>

                {/* Allocation Amount */}
                <div className="space-y-3">
                  <Label htmlFor="allocation" className="text-white/80">
                    Allocation Amount (USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <Input
                      id="allocation"
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
                    <Label htmlFor="drawdown" className="text-white/80">
                      Max Drawdown
                    </Label>
                    <span className="text-sm font-bold text-pink-400">{maxDrawdown[0]}%</span>
                  </div>
                  <Slider
                    id="drawdown"
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
                    This trader charges a <strong>{perfFee}%</strong> performance fee on profits. Fees are deducted
                    automatically from winning trades.
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
                    Copy trading involves significant risk. Past performance does not guarantee future results.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
