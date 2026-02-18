"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Target, Zap } from "lucide-react"
import { api } from "@/lib/api"

interface TradeData {
  pair: unknown; // Assuming pair can be string or object; refine if possible
  direction: string;
  volume_lots: number;
  entry_price: number;
  floating_p_l: number;
  status: string;
}

export default function TradingStats() {
  const [positions, setPositions] = useState<TradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    avgReturn: 0,
    drawdown: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getForexPositions()
        if (response.data?.positions) {
          setPositions(response.data.positions)

          // Calculate stats from positions
          const closedPositions = response.data.positions.filter((p: TradeData) => p.status === "closed")

          const winningTrades = closedPositions.filter((p: TradeData) => p.floating_p_l > 0).length
          const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0

          const totalPL = closedPositions.reduce((sum: number, p: TradeData) => sum + p.floating_p_l, 0)
          const avgReturn = closedPositions.length > 0 ? totalPL / closedPositions.length : 0

          setStats({
            totalTrades: response.data.positions.length,
            winRate: Math.round(winRate * 10) / 10,
            avgReturn: Math.round(avgReturn * 100) / 100,
            drawdown: -8.3, // Would need historical data for accurate drawdown
          })
        }
      } catch (error) {
        console.error("[v0] Failed to fetch trading data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const STATS_DISPLAY = [
    { label: "Total Trades", value: stats.totalTrades.toString(), icon: Target, color: "text-blue-400" },
    { label: "Win Rate", value: `${stats.winRate}%`, icon: TrendingUp, color: "text-green-400" },
    {
      label: "Avg Return",
      value: `${stats.avgReturn > 0 ? "+" : ""}${stats.avgReturn}%`,
      icon: Zap,
      color: "text-amber-400",
    },
    { label: "Drawdown", value: `${stats.drawdown}%`, icon: TrendingDown, color: "text-red-400" },
  ]

  const CHART_DATA = [
    { month: "Jan", balance: 10000, trades: 45 },
    { month: "Feb", balance: 12500, trades: 52 },
    { month: "Mar", balance: 11800, trades: 48 },
    { month: "Apr", balance: 14200, trades: 61 },
    { month: "May", balance: 16500, trades: 73 },
    { month: "Jun", balance: 15250, trades: 68 },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="pt-6">
                <div className="h-20 bg-slate-700/30 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_DISPLAY.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="bg-slate-800/30 border-slate-700/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle>Balance History</CardTitle>
            <CardDescription>Last 6 months performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="balance" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle>Trade Volume</CardTitle>
            <CardDescription>Monthly trade count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="trades" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Your latest trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positions.slice(0, 3).map((trade, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg border border-slate-700/30"
              >
                <div>
                  <p className="font-semibold text-white">
                    {typeof trade.pair === "string" ? trade.pair : (trade.pair as { name?: string }).name ?? "N/A"}
                  </p>
                  <p className="text-sm text-slate-400">
                    {trade.direction.toUpperCase()} • {trade.volume_lots} lots
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${trade.floating_p_l > 0 ? "text-green-400" : "text-red-400"}`}>
                    {trade.floating_p_l > 0 ? "+" : ""}
                    {trade.floating_p_l.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">{trade.status}</p>
                </div>
              </div>
            ))}
            {positions.length === 0 && <p className="text-center text-slate-400 py-8">No trades yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}