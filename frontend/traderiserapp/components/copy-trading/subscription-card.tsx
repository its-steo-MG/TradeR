"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Copy, Pause, Play, Trash2 } from "lucide-react"
import { pauseSubscription, createCopySubscription } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

interface SubscriptionCardProps {
  subscription: {
    id: number
    trader: {
      id: number
      username?: string
    }
    allocated_amount: number
    current_pnl: number
    copied_trades_count: number  // Fixed: matches backend
    is_active: boolean
    account: { id: number }  // From nested account in serializer
  }
  onUpdate?: () => void
}

export function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const displayName = subscription.trader.username || `Trader #${subscription.trader.id}`
  const avatarFallback = subscription.trader.username
    ? subscription.trader.username.substring(0, 2).toUpperCase()
    : `T${subscription.trader.id}`

  const allocatedAmount = subscription.allocated_amount
  const pnl = subscription.current_pnl
  const copiedTrades = subscription.copied_trades_count
  const returnPercent = allocatedAmount > 0 ? ((pnl / allocatedAmount) * 100).toFixed(2) : "0"

  const handlePause = async () => {
    setIsUpdating(true)
    const result = await pauseSubscription(subscription.id)
    setIsUpdating(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Paused", description: `Copying ${displayName} paused` })
      onUpdate?.()
    }
  }

  const handleResume = async () => {
    setIsUpdating(true)
    const result = await createCopySubscription({
      trader: subscription.trader.id,
      account: subscription.account.id,
      allocated_amount: subscription.allocated_amount,
    })
    setIsUpdating(false)

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Resumed", description: `Now copying ${displayName} again` })
      onUpdate?.()
    }
  }

  // Optional: Permanent stop (delete) — if you want this later, implement DELETE endpoint
  const handleStop = async () => {
    // Currently same as pause — change when you add delete endpoint
    await handlePause()
  }

  return (
    <Card className={`glass-card transition-all ${subscription.is_active ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-white/5 opacity-70"}`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-pink-500/30">
              <AvatarFallback className="bg-slate-800 font-bold">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold">{displayName}</h3>
              <Badge variant="outline" className="mt-1 text-xs">
                {subscription.is_active ? "Active" : "Paused"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 p-3 rounded-lg space-y-1 text-center">
            <div className="flex items-center justify-center gap-1 text-white/40">
              <DollarSign size={12} />
              <span className="text-[10px] uppercase font-semibold">Allocated</span>
            </div>
            <p className="text-sm font-bold">${allocatedAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg space-y-1 text-center">
            <div className="flex items-center justify-center gap-1 text-white/40">
              <TrendingUp size={12} />
              <span className="text-[10px] uppercase font-semibold">P&L</span>
            </div>
            <p className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg space-y-1 text-center">
            <div className="flex items-center justify-center gap-1 text-white/40">
              <Copy size={12} />
              <span className="text-[10px] uppercase font-semibold">Trades</span>
            </div>
            <p className="text-sm font-bold">{copiedTrades}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Return</span>
            <span className={pnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {returnPercent}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${pnl >= 0 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-rose-500 to-rose-400"}`}
              style={{ width: `${Math.min(Math.abs(Number(returnPercent)), 100)}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex gap-3">
        {subscription.is_active ? (
          <Button
            onClick={handlePause}
            disabled={isUpdating}
            variant="outline"
            className="flex-1 gap-2 border-white/10 hover:bg-amber-500/10 hover:text-amber-400"
          >
            <Pause size={16} />
            Pause
          </Button>
        ) : (
          <Button
            onClick={handleResume}
            disabled={isUpdating}
            className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600"
          >
            <Play size={16} />
            Resume
          </Button>
        )}

        <Button
          onClick={handleStop}
          disabled={isUpdating}
          variant="outline"
          className="flex-1 gap-2 border-white/10 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 size={16} />
          Stop
        </Button>
      </CardFooter>
    </Card>
  )
}