// app/robots/page.tsx
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { RobotMarketplace } from "@/components/robots/robot-marketplace"
import { UserRobots } from "@/components/robots/user-robots"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/format-currency"

interface Account {
  id: number
  account_type: string
  balance: number
  kyc_verified?: boolean
}

interface User {
  username: string
  email: string
  phone: string
  is_sashi: boolean
  is_email_verified: boolean
  accounts: Account[]
}

interface DashboardData {
  user: User
  accounts: Account[]
}

export default function RobotsPage() {
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncFromStorage = () => {
    const type = localStorage.getItem("account_type") || "standard"
    setLoginType(type === "demo" ? "demo" : "real")
  }

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error: apiErr } = await api.getDashboard()
        if (apiErr) throw new Error(apiErr as string)

        const dashboard = data as unknown as DashboardData
        if (!dashboard?.accounts?.length) throw new Error("Invalid data")

        const activeId = localStorage.getItem("active_account_id")
        const account =
          dashboard.accounts.find((a) => a.id === Number(activeId)) ||
          dashboard.accounts.find((a) => a.account_type === "standard") ||
          dashboard.accounts[0]

        if (!account) throw new Error("No account")

        setActiveAccount(account)
        syncFromStorage()
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetch()
    const handler = () => {
      fetch()
      syncFromStorage()
    }
    window.addEventListener("session-updated", handler)
    return () => window.removeEventListener("session-updated", handler)
  }, [])

  const updateBalance = (newBalance: number) => {
    if (!activeAccount) return

    const updated = { ...activeAccount, balance: newBalance }
    setActiveAccount(updated)

    const raw = localStorage.getItem("user_session")
    if (!raw) return
    const session: User = JSON.parse(raw)
    const newSession: User = {
      ...session,
      accounts: session.accounts.map((a) => (a.id === activeAccount.id ? updated : a)),
    }
    localStorage.setItem("user_session", JSON.stringify(newSession))
    window.dispatchEvent(new Event("session-updated"))
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background - same as dashboard */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="animate-in fade-in slide-in-from-top-10 duration-700">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Trading Robots</h1>
              <p className="text-white/60 text-lg">
                Purchase and manage automated trading robots
              </p>
            </div>
          </div>

          {/* Balance Card */}
          <div className="animate-in fade-in slide-in-from-top-10 duration-700 delay-100">
            <div className="rounded-3xl p-6 sm:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <p className="text-sm text-white/60 mb-2 flex items-center gap-2">
                {loginType === "demo" ? (
                  <>
                    <span className="text-blue-400">◉</span> Demo Account
                  </>
                ) : (
                  <>
                    <span className="text-emerald-400">◉</span> Real Account
                  </>
                )}
              </p>
              <p className="text-5xl sm:text-6xl font-bold tracking-tighter">
                ${formatCurrency(activeAccount?.balance || 0)}
              </p>
            </div>
          </div>

          {/* Responsive Tabs */}
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            <Tabs defaultValue="marketplace" className="w-full">
              <TabsList className="inline-flex h-auto w-full p-1 bg-white/10 border border-white/20 rounded-3xl shadow-inner overflow-hidden">
                <TabsTrigger
                  value="marketplace"
                  className="flex-1 py-3.5 text-base font-semibold rounded-3xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Marketplace
                </TabsTrigger>
                <TabsTrigger
                  value="my-robots"
                  className="flex-1 py-3.5 text-base font-semibold rounded-3xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  My Robots
                </TabsTrigger>
              </TabsList>

              <TabsContent value="marketplace" className="mt-6">
                <RobotMarketplace balance={activeAccount?.balance || 0} onBalanceChange={updateBalance} />
              </TabsContent>

              <TabsContent value="my-robots" className="mt-6">
                <UserRobots />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-white/20 border-t-pink-500 rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-semibold">Loading Robots...</p>
              <p className="text-white/60">Finding the best AI traders for you</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="text-center max-w-md p-8 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
            <p className="text-white/70 mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 px-8 rounded-2xl hover:scale-105 transition-transform"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}