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

  // ---- Balance update helper (used by marketplace) ----
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white text-xl">Loading robots...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">Warning</div>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Trading Robots</h1>
        <p className="text-white/60">Purchase and manage automated trading robots</p>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20">
        <p className="text-sm text-white/60 mb-2">{loginType === "demo" ? "Demo" : "Real"} Account Balance</p>
        <p className="text-4xl font-bold">${formatCurrency(activeAccount?.balance || 0)}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/10 border border-white/20">
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="my-robots" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
            My Robots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          <RobotMarketplace balance={activeAccount?.balance || 0} onBalanceChange={updateBalance} />
        </TabsContent>

        <TabsContent value="my-robots">
          <UserRobots />
        </TabsContent>
      </Tabs>
    </div>
  )
}
