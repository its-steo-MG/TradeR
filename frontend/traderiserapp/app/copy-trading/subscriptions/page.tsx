"use client"

import { useState, useEffect } from "react"
import { SubscriptionCard } from "@/components/copy-trading/subscription-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp } from "lucide-react"
import { fetchUserSubscriptions } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Subscription {
  id: number
  trader: { id: number; username?: string }
  account: { id: number }
  allocated_amount: number
  current_pnl: number
  copied_trades_count: number
  is_active: boolean
}

const card = "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubscriptions = async () => {
    setLoading(true)
    const result = await fetchUserSubscriptions()
    if (result.error) setSubscriptions([])
    else if (result.data && Array.isArray(result.data)) {
      setSubscriptions(result.data.map((item: unknown): Subscription => {
        const data = item as Record<string, unknown>
        const rawTrader = data.trader as Record<string, unknown> | undefined
        const rawAccount = data.account as Record<string, unknown> | undefined
        return {
          id: Number(data.id ?? 0),
          trader: {
            id: Number(rawTrader?.id ?? data.trader_id ?? data.traderId ?? 0),
            username: typeof rawTrader?.username === "string" ? rawTrader.username : typeof data.trader_username === "string" ? data.trader_username : undefined,
          },
          account: { id: rawAccount?.id !== undefined ? Number(rawAccount.id) : Number(data.account ?? data.account_id ?? data.accountId ?? 0) },
          allocated_amount: Number(data.allocated_amount ?? 0),
          current_pnl: Number(data.current_pnl ?? 0),
          copied_trades_count: Number(data.copied_trades_count ?? data.copied_trades ?? 0),
          is_active: Boolean(data.is_active),
        }
      }))
    } else setSubscriptions([])
    setLoading(false)
  }

  useEffect(() => { loadSubscriptions() }, [])

  const activeSubscriptions = subscriptions.filter((s) => s.is_active)
  const pausedSubscriptions = subscriptions.filter((s) => !s.is_active)
  const totalAllocated = subscriptions.reduce((sum, s) => sum + s.allocated_amount, 0)
  const totalPnl = subscriptions.reduce((sum, s) => sum + s.current_pnl, 0)

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 bg-slate-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 bg-slate-100 dark:bg-zinc-800" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">My <span className="text-pink-600 dark:text-pink-400">Subscriptions</span></h1>
        <p className="text-slate-500 dark:text-zinc-400">Manage your active copy trading subscriptions and track performance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className={card}><CardContent className="p-4 sm:p-6 space-y-2"><div className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><Users size={18} /><span className="text-sm text-slate-500 dark:text-zinc-400 uppercase font-semibold">Active Copies</span></div><p className="text-3xl font-bold">{activeSubscriptions.length}</p><p className="text-xs text-slate-500 dark:text-zinc-400">{pausedSubscriptions.length} paused</p></CardContent></Card>
        <Card className={card}><CardContent className="p-4 sm:p-6 space-y-2"><div className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><TrendingUp size={18} /><span className="text-sm text-slate-500 dark:text-zinc-400 uppercase font-semibold">Total Allocated</span></div><p className="text-3xl font-bold">${totalAllocated.toFixed(2)}</p><p className="text-xs text-slate-500 dark:text-zinc-400">Across all traders</p></CardContent></Card>
        <Card className={card}><CardContent className="p-4 sm:p-6 space-y-2"><div className="flex items-center gap-2 text-pink-600 dark:text-pink-400"><TrendingUp size={18} /><span className="text-sm text-slate-500 dark:text-zinc-400 uppercase font-semibold">Total P&L</span></div><p className={`text-3xl font-bold ${totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(2)}</p><p className="text-xs text-slate-500 dark:text-zinc-400">{totalAllocated > 0 ? Math.abs((totalPnl / totalAllocated) * 100).toFixed(2) : "0"}% return</p></CardContent></Card>
      </div>
      {activeSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Active Subscriptions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{activeSubscriptions.map((sub) => <SubscriptionCard key={sub.id} subscription={sub} onUpdate={loadSubscriptions} />)}</div>
        </div>
      )}
      {pausedSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-500 dark:text-zinc-400"><span className="w-2 h-2 bg-slate-300 dark:bg-zinc-600 rounded-full" /> Paused Subscriptions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{pausedSubscriptions.map((sub) => <SubscriptionCard key={sub.id} subscription={sub} onUpdate={loadSubscriptions} />)}</div>
        </div>
      )}
      {subscriptions.length === 0 && (
        <Card className={card}>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center"><Users size={32} className="text-slate-400" /></div>
            <h3 className="text-xl font-semibold">No Active Subscriptions</h3>
            <p className="text-slate-500 dark:text-zinc-400">Start copying top traders to grow your portfolio automatically</p>
            <Link href="/copy-trading"><Button className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">Browse Traders</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
