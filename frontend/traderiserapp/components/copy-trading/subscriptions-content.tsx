"use client"

import { useState, useEffect } from "react"
import { SubscriptionCard } from "@/components/copy-trading/subscription-card"
import { Card, CardContent } from "@/components/ui/card"
import { Users, TrendingUp, DollarSign } from "lucide-react"
import { fetchUserSubscriptions } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Trader {
  id: number
  username: string
  bio: string
  risk_level: 'low' | 'medium' | 'high'
  min_allocation: number
  performance_fee_percent: number
  win_rate: number
  average_return: number
  subscriber_count: number
}

interface Subscription {
  id: number
  account: { id: number; account_type: string }
  account_type: string
  trader: Trader
  allocated_amount: number
  max_drawdown_percent: number
  is_active: boolean
  created_at: string
  updated_at: string
  current_pnl: number
  copied_trades_count: number
}

export function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubscriptions = async () => {
    setLoading(true)
    const result = await fetchUserSubscriptions()

    if (result.error) {
      console.error("Failed to fetch subscriptions:", result.error)
      setSubscriptions([])
    } else if (result.data && Array.isArray(result.data)) {
      const mappedData: Subscription[] = result.data.map((raw: unknown): Subscription => {
        const item = raw as Record<string, unknown>

        // Safely extract nested trader with fallbacks
        const rawTrader = item.trader as Record<string, unknown> | undefined

        const trader: Trader = {
          id: Number(rawTrader?.id ?? 0),
          username: (rawTrader?.username as string) ?? "Unknown Trader",
          bio: (rawTrader?.bio as string) ?? "",
          risk_level: (rawTrader?.risk_level as 'low' | 'medium' | 'high') ?? 'medium',
          min_allocation: Number(rawTrader?.min_allocation ?? 0),
          performance_fee_percent: Number(rawTrader?.performance_fee_percent ?? 0),
          win_rate: Number(rawTrader?.win_rate ?? 0),
          average_return: Number(rawTrader?.average_return ?? 0),
          subscriber_count: Number(rawTrader?.subscriber_count ?? 0),
        }

        // Safely extract account
        const rawAccount = item.account as Record<string, unknown> | undefined

        return {
          id: Number(item.id ?? 0),
          account: {
            id: Number(rawAccount?.id ?? item.account_id ?? 0),
            account_type: (rawAccount?.account_type as string) ?? (item.account_type as string) ?? "Unknown",
          },
          account_type: (item.account_type as string) ?? "Unknown",
          trader,
          allocated_amount: Number(item.allocated_amount ?? 0),
          max_drawdown_percent: Number(item.max_drawdown_percent ?? 0),
          is_active: Boolean(item.is_active),
          created_at: (item.created_at as string) ?? "",
          updated_at: (item.updated_at as string) ?? "",
          current_pnl: Number(item.current_pnl ?? 0),
          copied_trades_count: Number(item.copied_trades_count ?? 0),
        }
      })

      setSubscriptions(mappedData)
    } else {
      setSubscriptions([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const pausedSubscriptions = subscriptions.filter(s => !s.is_active)

  const totalAllocated = subscriptions.reduce((sum, s) => sum + s.allocated_amount, 0)
  const totalPnl = subscriptions.reduce((sum, s) => sum + s.current_pnl, 0)

  const handleRefresh = async () => {
    await loadSubscriptions()
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Users size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">Active Copies</span>
            </div>
            <p className="text-3xl font-bold">{activeSubscriptions.length}</p>
            <p className="text-xs text-white/40">{pausedSubscriptions.length} paused</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <DollarSign size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">Total Allocated</span>
            </div>
            <p className="text-3xl font-bold">${totalAllocated.toFixed(2)}</p>
            <p className="text-xs text-white/40">Across all traders</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-pink-400">
              <TrendingUp size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">Total P&L</span>
            </div>
            <p className={`text-3xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(2)}
            </p>
            <p className="text-xs text-white/40">
              {totalAllocated > 0
                ? `${((totalPnl / totalAllocated) * 100).toFixed(2)}% return`
                : "0% return"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Active Subscriptions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSubscriptions.map((sub) => (
              <SubscriptionCard key={sub.id} subscription={sub} onUpdate={handleRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Paused Subscriptions */}
      {pausedSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white/60">
            <span className="w-2 h-2 bg-white/30 rounded-full" />
            Paused Subscriptions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pausedSubscriptions.map((sub) => (
              <SubscriptionCard key={sub.id} subscription={sub} onUpdate={handleRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {subscriptions.length === 0 && (
        <Card className="glass-card border-white/5">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center">
              <Users size={32} className="text-white/40" />
            </div>
            <h3 className="text-xl font-semibold">No Subscriptions Yet</h3>
            <p className="text-white/50">Start copying top traders to grow your portfolio automatically</p>
            <Link href="/copy-trading">
              <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700">
                Browse Traders
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}