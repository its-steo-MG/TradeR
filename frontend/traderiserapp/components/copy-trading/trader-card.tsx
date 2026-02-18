"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Users, TrendingUp, Shield } from "lucide-react"
import { useState } from "react"
import { TraderDetailDialog } from "./trader-detail-dialog"

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
    performance_fee_percent: number
    is_verified?: boolean
  }
}

export function TraderCard({ trader }: TraderCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const displayName = trader.username || `Trader #${trader.id}`
  const avatarFallback = trader.username ? trader.username.substring(0, 2).toUpperCase() : `T${trader.id}`

  const riskColor =
    trader.risk_level === "low"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : trader.risk_level === "medium"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-rose-400 bg-rose-400/10 border-rose-400/20"

  const winRate = Number(trader.win_rate) || 0
  const avgReturn = Number(trader.average_return) || 0
  const subCount = Number(trader.subscriber_count) || 0

  return (
    <>
      <Card className="glass-card hover:border-pink-500/30 transition-all duration-300 group overflow-hidden flex flex-col h-full border-white/10">
        <CardContent className="p-6 space-y-4 flex-1">
          {/* Header: Avatar and Username */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative p-1 rounded-full bg-gradient-to-br from-pink-500 to-blue-500">
                <Avatar className="w-12 h-12 border-2 border-black">
                  <AvatarImage src={`/.jpg?height=48&width=48&query=${displayName}`} />
                  <AvatarFallback className="bg-slate-800 text-white font-bold">{avatarFallback}</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-white text-lg group-hover:text-pink-300 transition-colors line-clamp-1">
                    {displayName}
                  </h3>
                  {trader.is_verified && <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />}
                </div>
                <Badge variant="outline" className={`mt-1 capitalize text-xs px-2 py-0.5 ${riskColor}`}>
                  {trader.risk_level} Risk
                </Badge>
              </div>
            </div>
          </div>

          {/* Bio - Now clearly visible */}
          <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
            {trader.bio}
          </p>

          {/* Stats Grid */}
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

          {/* Equity Sparkline - Slightly more visible */}
          <div className="h-12 w-full flex items-end gap-[2px] pt-2 opacity-70">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-pink-500/60 to-pink-500/90 rounded-t-sm"
                style={{ height: `${30 + Math.sin(i / 3) * 50 + Math.random() * 20}%` }}
              />
            ))}
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0 mt-auto">
          <div className="w-full space-y-4">
            {/* Subs & Fee Row - Now readable without hover */}
            <div className="flex items-center justify-between w-full text-sm text-white/80 font-medium">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="flex-shrink-0" />
                {subCount.toLocaleString()} Subscribers
              </span>
              <span>Fee: {Number(trader.performance_fee_percent || 0)}%</span>
            </div>

            {/* View Profile Button */}
            <Button
              onClick={() => setDetailsOpen(true)}
              className="w-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600 hover:to-purple-600 backdrop-blur-sm border border-white/20 hover:border-pink-500 text-white font-semibold rounded-xl transition-all duration-300 py-6 text-base shadow-lg hover:shadow-pink-500/30"
            >
              <span className="hidden xs:inline">View Full Profile</span>
              <span className="xs:hidden">View Profile</span>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <TraderDetailDialog trader={trader} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </>
  )
}