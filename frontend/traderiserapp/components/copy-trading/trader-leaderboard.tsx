"use client"

import { useEffect, useState } from "react"
import { TraderCard } from "./trader-card"
import { fetchTraders, type Trader } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function TraderLeaderboard() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTraders() {
      setLoading(true)
      setError(null)
      const result = await fetchTraders()
      if (result.error) { setError(result.error); setTraders([]) }
      else if (result.data && Array.isArray(result.data)) setTraders(result.data)
      setLoading(false)
    }
    loadTraders()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[400px] bg-slate-100 dark:bg-zinc-800" />)}
      </div>
    )
  }
  if (error && traders.length === 0) {
    return (
      <Alert className="bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800">
        <AlertCircle className="h-4 w-4 text-rose-600" />
        <AlertDescription>Failed to load traders: {error}. Please try again later.</AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
      {traders.map((trader) => <TraderCard key={trader.id} trader={trader} />)}
    </div>
  )
}
