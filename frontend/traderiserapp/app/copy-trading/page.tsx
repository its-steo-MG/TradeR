"use client"

import { useState } from "react"
import Link from "next/link"
import { TraderLeaderboard } from "@/components/copy-trading/trader-leaderboard"
import { SubscriptionsContent } from "@/components/copy-trading/subscriptions-content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, TrendingUp, Users } from "lucide-react"

export default function CopyTradingPage() {
  const [activeTab, setActiveTab] = useState("traders")
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium">
            <TrendingUp size={16} /> Copy the Best
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight">Copy Top <span className="text-pink-600 dark:text-pink-400">Traders</span></h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-zinc-400 leading-relaxed">Automatically mirror the trades of proven professionals. Set your allocation, manage risk, and watch your portfolio grow with the experts.</p>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <TabsList className="w-full sm:w-auto overflow-x-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <TabsTrigger value="traders" className="gap-2"><TrendingUp size={16} /> Top Traders</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2"><Users size={16} /> My Subscriptions</TabsTrigger>
          </TabsList>
          {activeTab === "traders" && (
            <Link href="/copy-trading/become-trader" className="w-full md:w-auto">
              <Button className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold">Become a Trader</Button>
            </Link>
          )}
        </div>
        <TabsContent value="traders" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-zinc-950 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input placeholder="Search traders by username or strategy..." className="pl-10 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-xl h-11" disabled />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Button variant="outline" size="sm" className="rounded-full gap-2 h-9" disabled><Filter size={14} /> Risk Level</Button>
              <Button variant="outline" size="sm" className="rounded-full gap-2 h-9" disabled>Win Rate</Button>
              <Button variant="outline" size="sm" className="rounded-full gap-2 h-9" disabled>Subscribers</Button>
            </div>
          </div>
          <TraderLeaderboard />
        </TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsContent /></TabsContent>
      </Tabs>
    </div>
  )
}
