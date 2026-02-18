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

      if (result.error) {
        console.error("[v0] Failed to fetch traders:", result.error)
        setError(result.error)
        setTraders([])
      } else if (result.data) {
        setTraders(result.data)
      }

      setLoading(false)
    }

    loadTraders()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] bg-white/5" />
        ))}
      </div>
    )
  }

  if (error && traders.length === 0) {
    return (
      <Alert className="bg-rose-500/10 border-rose-500/20">
        <AlertCircle className="h-4 w-4 text-rose-400" />
        <AlertDescription className="text-white/80">
          Failed to load traders: {error}. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {traders.map((trader) => (
        <TraderCard key={trader.id} trader={trader} />
      ))}
    </div>
  )
}
