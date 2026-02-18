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

interface Account {
  id: number
  account_type: string
  balance: number
  kyc_verified?: boolean
}

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

  useEffect(() => {
    const raw = localStorage.getItem("user_session")
    if (raw) {
      try {
        const data: User = JSON.parse(raw)
        setUser(data)
        setIsLoggedIn(true)

        const activeId = localStorage.getItem("active_account_id")
        const account = data.accounts.find((acc: Account) => acc.id === Number(activeId)) || data.accounts[0]
        setActiveAccount(account)
        setLoginType(account.account_type === "demo" ? "demo" : "real")
      } catch (err) {
        console.error("Failed to parse user session:", err)
      }
    }
  }, [])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true)
        const res = await api.getAgents()
        if (res.error) throw new Error(res.error)

        const agentsData = Array.isArray(res.data) ? res.data : res.data?.agents || []

        console.log("Fetched agents data:", agentsData)

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

  useEffect(() => {
    let filtered = agents

    if (selectedMethod) {
      filtered = filtered.filter((agent) => agent.method.toLowerCase() === selectedMethod.toLowerCase())
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (agent) => agent.name.toLowerCase().includes(query) || agent.location?.toLowerCase().includes(query) || false,
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

  const handleSwitchAccount = async (account: Account) => {
    try {
      localStorage.setItem("active_account_id", account.id.toString())
      localStorage.setItem("account_type", account.account_type)
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real")

      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((acc: Account) =>
          acc.id === account.id ? { ...acc, balance: Number(account.balance) || 0 } : acc,
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

  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((acc: Account) => acc.account_type !== "demo")
      : (user?.accounts || []).filter((acc: Account) => acc.account_type === "demo")

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
          //onSwitchAccount={handleSwitchAccount}
        />
        <main className="flex-1 w-full overflow-auto md:pl-64 bg-white">
          <AgentHeader />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            <AgentFilters
              selectedMethod={selectedMethod}
              onMethodChange={setSelectedMethod}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <AgentGrid agents={filteredAgents} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  )
}
