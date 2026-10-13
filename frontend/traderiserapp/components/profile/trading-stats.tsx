"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Target, Zap } from "lucide-react";
import { api } from "@/lib/api";

interface TradeData {
  pair: unknown;
  direction: string;
  volume_lots: number;
  entry_price: number;
  floating_p_l: number | string | null | undefined;
  status: string;
}

const card = "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800";

export default function TradingStats() {
  const [positions, setPositions] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTrades: 0, winRate: 0, avgReturn: 0, drawdown: 0 });

  const formatFloatingPL = (value: number | string | null | undefined) => {
    const num = Number(value || 0);
    return `${num > 0 ? "+" : ""}${num.toFixed(2)}`;
  };
  const getPLColor = (value: number | string | null | undefined) => Number(value || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getForexPositions();
        if (response.data?.positions) {
          setPositions(response.data.positions);
          const closed = response.data.positions.filter((p: TradeData) => p.status === "closed");
          const winning = closed.filter((p: TradeData) => Number(p.floating_p_l) > 0).length;
          const totalPL = closed.reduce((sum: number, p: TradeData) => sum + Number(p.floating_p_l || 0), 0);
          setStats({
            totalTrades: response.data.positions.length,
            winRate: Math.round((closed.length ? (winning / closed.length) * 100 : 0) * 10) / 10,
            avgReturn: Math.round((closed.length ? totalPL / closed.length : 0) * 100) / 100,
            drawdown: -8.3,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const STATS_DISPLAY = [
    { label: "Total Trades", value: stats.totalTrades.toString(), icon: Target, color: "text-blue-600 dark:text-blue-400" },
    { label: "Win Rate", value: `${stats.winRate}%`, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Avg Return", value: `${stats.avgReturn > 0 ? "+" : ""}${stats.avgReturn}%`, icon: Zap, color: "text-amber-600 dark:text-amber-400" },
    { label: "Drawdown", value: `${stats.drawdown}%`, icon: TrendingDown, color: "text-rose-600 dark:text-rose-400" },
  ];
  const CHART_DATA = [
    { month: "Jan", balance: 10000, trades: 45 },
    { month: "Feb", balance: 12500, trades: 52 },
    { month: "Mar", balance: 11800, trades: 48 },
    { month: "Apr", balance: 14200, trades: 61 },
    { month: "May", balance: 16500, trades: 73 },
    { month: "Jun", balance: 15250, trades: 68 },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className={card}><CardContent className="pt-6"><div className="h-20 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_DISPLAY.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={card}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-zinc-400">{stat.label}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={card}>
          <CardHeader><CardTitle>Balance History</CardTitle><CardDescription>Last 6 months performance</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                <XAxis dataKey="month" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="balance" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className={card}>
          <CardHeader><CardTitle>Trade Volume</CardTitle><CardDescription>Monthly trade count</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis dataKey="month" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }} />
                <Bar dataKey="trades" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className={card}>
        <CardHeader><CardTitle>Recent Trades</CardTitle><CardDescription>Your latest trading activity</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positions.slice(0, 3).map((trade, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
                <div>
                  <p className="font-semibold">{typeof trade.pair === "string" ? trade.pair : (trade.pair as { name?: string }).name ?? "N/A"}</p>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">{trade.direction.toUpperCase()} • {trade.volume_lots} lots</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getPLColor(trade.floating_p_l)}`}>{formatFloatingPL(trade.floating_p_l)}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{trade.status}</p>
                </div>
              </div>
            ))}
            {positions.length === 0 && <p className="text-center text-slate-500 dark:text-zinc-400 py-8">No trades yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
