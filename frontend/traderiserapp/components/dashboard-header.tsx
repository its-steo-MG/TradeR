"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TrendingUp, User, Settings, LogOut, Wallet, RefreshCw, Star } from "lucide-react"
import { api } from "@/lib/api"

interface UserData {
  email: string
  balance: string
  account_type?: string
}

interface AccountResponse {
  user: UserData
  demo_account?: {
    virtual_balance: string
  }
}

export function DashboardHeader() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [balance, setBalance] = useState("0.00")
  const [demoBalance, setDemoBalance] = useState("10000.00")
  const [isDemoAccount, setIsDemoAccount] = useState(false)

  useEffect(() => {
    loadAccount()
  }, [])

  const loadAccount = async () => {
    const response = await api.getAccount()
    if (response.data) {
      const data = response.data as AccountResponse
      setUser(data.user)
      setBalance(data.user.balance)
      if (data.demo_account) {
        setDemoBalance(data.demo_account.virtual_balance)
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    router.push("/login")
  }

  const toggleAccountType = () => {
    setIsDemoAccount(!isDemoAccount)
  }

  const currentBalance = isDemoAccount ? demoBalance : balance

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Traderiser</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Trade
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/positions")}>
              Positions
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/history")}>
              History
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/bots")}>
              Bots
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/payments")}>
              Payments
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/watchlist")}>
              <Star className="w-4 h-4 mr-2" />
              Watchlist
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={toggleAccountType} className="gap-2 bg-transparent">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">{isDemoAccount ? "Demo" : "Real"}</span>
            <Badge variant={isDemoAccount ? "secondary" : "default"}>${currentBalance}</Badge>
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">${currentBalance}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.account_type} Account</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/account")}>
                <User className="mr-2 w-4 h-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <Settings className="mr-2 w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
