"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import AgentHeader from "@/components/agents/agent-header"
import AgentFilters from "@/components/agents/agent-filters"
import AgentGrid from "@/components/agents/agent-grid"
import { Sidebar } from "@/components/sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { toast } from "sonner"
import type { Account } from "@/types/account"
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Loader2 } from "lucide-react"

interface User {
  username: string
  email: string
  image?: string
  accounts: Account[]
}

interface Agent {
  id: number
  name: string
  method: string
  location: string
  rating: number
  reviews: number
  deposit_rate_kes_to_usd: number
  withdrawal_rate_usd_to_kes: number
  min_amount?: number
  max_amount?: number
  response_time?: string
  verified: boolean
  image?: string
  profile_picture?: string
  instructions?: string
}

interface Transaction {
  id: number
  account_id: number
  account_type?: string
  amount: string
  type: string
  description: string
  created_at: string
  created_at_formatted: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("rate")
  const [searchQuery, setSearchQuery] = useState("")

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loginType, setLoginType] = useState<string>("real")
  const router = useRouter()

  // Transaction History states
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")

  useEffect(() => {
    const raw = localStorage.getItem("user_session")
    if (raw) {
      try {
        const data = JSON.parse(raw) as User
        setUser(data)
        setIsLoggedIn(true)

        const activeId = localStorage.getItem("active_account_id")
        const account = data.accounts.find((acc) => acc.id === Number(activeId)) || data.accounts[0]
        setActiveAccount(account)
        setLoginType(account?.account_type === "demo" ? "demo" : "real")
      } catch (err) {
        console.error("Failed to parse user session:", err)
      }
    }
  }, [])

  // Fetch Agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true)
        const res = await api.getAgents()
        if (res.error) throw new Error(res.error)

        const agentsData = Array.isArray(res.data) ? res.data : res.data?.agents || []
        setAgents(agentsData)
        setFilteredAgents(agentsData)
      } catch (error) {
        console.error("Failed to fetch agents:", error)
        toast.error("Failed to load agents")
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  // Fetch Transaction History
  const fetchTransactions = async (accountId?: string) => {
    if (!isLoggedIn) return
    try {
      setTxLoading(true)

      const res = await api.getTransactionHistory({
        account_id: accountId === "all" ? undefined : accountId,
        limit: 30,
      })

      if (res.error) {
        throw new Error(typeof res.error === "string" ? res.error : "Failed to load transactions")
      }

      setTransactions(res.data?.results || [])
    } catch (err) {
      console.error("Failed to load transactions:", err)
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchTransactions(selectedAccountId)
    }
  }, [isLoggedIn, selectedAccountId])

  // Filter agents
  useEffect(() => {
    let filtered = [...agents]

    if (selectedMethod) {
      filtered = filtered.filter((agent) => agent.method.toLowerCase() === selectedMethod.toLowerCase())
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.location?.toLowerCase().includes(query)
      )
    }

    if (sortBy === "rate") {
      filtered.sort((a, b) => b.deposit_rate_kes_to_usd - a.deposit_rate_kes_to_usd)
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating)
    } else if (sortBy === "reviews") {
      filtered.sort((a, b) => b.reviews - a.reviews)
    }

    setFilteredAgents(filtered)
  }, [agents, selectedMethod, searchQuery, sortBy])

  const handleSwitchAccount = (account: Account) => {
    try {
      localStorage.setItem("active_account_id", String(account.id))
      localStorage.setItem("account_type", account.account_type)
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real")

      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((acc) =>
          String(acc.id) === String(account.id)
            ? { ...acc, balance: Number(account.balance) || 0 }
            : acc
        ),
      }

      setUser(updatedUser)
      setActiveAccount(account)
      setLoginType(account.account_type === "demo" ? "demo" : "real")
      localStorage.setItem("user_session", JSON.stringify(updatedUser))
      window.dispatchEvent(new Event("session-updated"))
    } catch (error) {
      console.error("Error switching account:", error)
      toast.error("Failed to switch account. Please try again.")
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUser(null)
    setActiveAccount(null)
    setLoginType("real")
    router.push("/login")
  }

  const availableAccounts = loginType === "real"
    ? (user?.accounts || []).filter((acc) => acc.account_type !== "demo")
    : (user?.accounts || []).filter((acc) => acc.account_type === "demo")

  const getTypeIcon = (type: string) => {
    if (type === "deposit") return <ArrowDownCircle className="w-4 h-4 text-green-600" />
    if (type === "withdrawal") return <ArrowUpCircle className="w-4 h-4 text-red-500" />
    return <RefreshCw className="w-4 h-4 text-blue-500" />
  }

  const getTypeColor = (type: string) => {
    if (type === "deposit") return "text-green-700 bg-green-50"
    if (type === "withdrawal") return "text-red-700 bg-red-50"
    return "text-blue-700 bg-blue-50"
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={Number(activeAccount?.balance) || 0}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={availableAccounts}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />

      <div className="flex flex-1">
        <Sidebar
          loginType={loginType}
          activeAccount={activeAccount}
          accounts={availableAccounts}
        />

        <main className="flex-1 w-full overflow-auto md:pl-64 bg-white">
          <AgentHeader />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            {/* Filters + Agents Grid */}
            <AgentFilters
              selectedMethod={selectedMethod}
              onMethodChange={setSelectedMethod}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <AgentGrid agents={filteredAgents} loading={loading} />

            {/* ===================== TRANSACTION HISTORY ===================== */}
            {isLoggedIn && (
              <div className="mt-16 border-t border-slate-200 pt-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Transaction History
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Your recent deposits, withdrawals and refunds
                    </p>
                  </div>

                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="all">All Accounts</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_type === "standard"
                          ? "TradR"
                          : acc.account_type === "pro-fx"
                          ? "Pro-FX"
                          : "MT5"}{" "}
                        • ${Number(acc.balance).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {txLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                      No transactions found yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((tx) => {
                            const amount = Number(tx.amount)
                            const isPositive = amount >= 0

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition">
                                <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                  {tx.created_at_formatted}
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(
                                      tx.type
                                    )}`}
                                  >
                                    {getTypeIcon(tx.type)}
                                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`font-semibold ${
                                      isPositive ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {isPositive ? "+" : ""}${Math.abs(amount).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-600 max-w-xs truncate">
                                  {tx.description || "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* =================== END TRANSACTION HISTORY =================== */}
          </div>
        </main>
      </div>
    </div>
  )
}