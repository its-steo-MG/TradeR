"use client"

import { useState, useEffect } from "react"
import { SubscriptionCard } from "@/components/copy-trading/subscription-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp } from "lucide-react"
import { fetchUserSubscriptions } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Exact type expected by SubscriptionCard
interface Subscription {
  id: number
  trader: {
    id: number
    username?: string
  }
  account: {
    id: number
  }
  allocated_amount: number
  current_pnl: number
  copied_trades_count: number
  is_active: boolean
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubscriptions = async () => {
    setLoading(true)
    const result = await fetchUserSubscriptions()

    if (result.error) {
      console.error("[v0] Failed to fetch subscriptions:", result.error)
      setSubscriptions([])
    } else if (result.data && Array.isArray(result.data)) {
      const mappedData: Subscription[] = result.data.map((item: unknown): Subscription => {
        // Safely treat as record with unknown values
        const data = item as Record<string, unknown>

        // Extract trader info safely
        const rawTrader = data.trader as Record<string, unknown> | undefined
        const traderId = Number(rawTrader?.id ?? data.trader_id ?? data.traderId ?? 0)
        const traderUsername = 
          typeof rawTrader?.username === "string" 
            ? rawTrader.username 
            : typeof data.trader_username === "string"
              ? data.trader_username
              : undefined

        // Extract account id safely (handles both object and flat number)
        const rawAccount = data.account as Record<string, unknown> | undefined
        const accountId = rawAccount?.id !== undefined
          ? Number(rawAccount.id)
          : Number(data.account ?? data.account_id ?? data.accountId ?? 0)

        return {
          id: Number(data.id ?? 0),
          trader: {
            id: traderId,
            username: traderUsername,
          },
          account: {
            id: accountId,
          },
          allocated_amount: Number(data.allocated_amount ?? 0),
          current_pnl: Number(data.current_pnl ?? 0),
          copied_trades_count: Number(data.copied_trades_count ?? data.copied_trades ?? 0),
          is_active: Boolean(data.is_active),
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

  const activeSubscriptions = subscriptions.filter((s) => s.is_active)
  const pausedSubscriptions = subscriptions.filter((s) => !s.is_active)

  const totalAllocated = subscriptions.reduce((sum, s) => sum + s.allocated_amount, 0)
  const totalPnl = subscriptions.reduce((sum, s) => sum + s.current_pnl, 0)

  const handleRefresh = () => {
    loadSubscriptions()
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <Skeleton className="h-32 bg-white/5" />
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          My <span className="text-gradient-pink">Subscriptions</span>
        </h1>
        <p className="text-white/60">
          Manage your active copy trading subscriptions and track performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Users size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">
                Active Copies
              </span>
            </div>
            <p className="text-3xl font-bold">{activeSubscriptions.length}</p>
            <p className="text-xs text-white/40">
              {pausedSubscriptions.length} paused
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <TrendingUp size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">
                Total Allocated
              </span>
            </div>
            <p className="text-3xl font-bold">${totalAllocated.toFixed(2)}</p>
            <p className="text-xs text-white/40">Across all traders</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-pink-400">
              <TrendingUp size={18} />
              <span className="text-sm text-white/50 uppercase font-semibold">
                Total P&L
              </span>
            </div>
            <p
              className={`text-3xl font-bold ${
                totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(2)}
            </p>
            <p className="text-xs text-white/40">
              {totalPnl >= 0 ? "+" : "-"}
              {totalAllocated > 0
                ? Math.abs((totalPnl / totalAllocated) * 100).toFixed(2)
                : "0"}
              % return
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
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onUpdate={handleRefresh}
              />
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
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onUpdate={handleRefresh}
              />
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
            <h3 className="text-xl font-semibold">No Active Subscriptions</h3>
            <p className="text-white/50">
              Start copying top traders to grow your portfolio automatically
            </p>
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