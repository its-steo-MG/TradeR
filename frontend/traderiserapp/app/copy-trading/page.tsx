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
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12 glass-card">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-pink-500/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium">
            <TrendingUp size={16} />
            <span>Copy the Best</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Copy Top <span className="text-gradient-pink">Traders</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Automatically mirror the trades of proven professionals. Set your allocation, manage risk, and watch your
            portfolio grow with the experts.
          </p>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Navigation */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="traders" className="gap-2 data-[state=active]:bg-pink-500/20">
              <TrendingUp size={16} />
              Top Traders
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 data-[state=active]:bg-pink-500/20">
              <Users size={16} />
              My Subscriptions
            </TabsTrigger>
          </TabsList>

          {activeTab === "traders" && (
            <Link href="/copy-trading/become-trader" passHref>
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-semibold">
                Become a Trader
              </Button>
            </Link>
          )}
        </div>

        {/* Top Traders Tab */}
        <TabsContent value="traders" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <Input
                placeholder="Search traders by username or strategy..."
                className="pl-10 bg-black/40 border-white/10 focus:ring-pink-500/50 rounded-xl h-11"
                disabled
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 gap-2 h-9 bg-transparent"
                disabled
              >
                <Filter size={14} /> Risk Level
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 gap-2 h-9 bg-transparent"
                disabled
              >
                Win Rate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 gap-2 h-9 bg-transparent"
                disabled
              >
                Subscribers
              </Button>
            </div>
          </div>

          {/* Leaderboard Grid */}
          <TraderLeaderboard />
        </TabsContent>

        {/* My Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <SubscriptionsContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
