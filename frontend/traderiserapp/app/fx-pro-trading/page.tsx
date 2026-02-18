"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import MainPage from "@/components/fx-pro-trading/main-page"
import RobotsPage from "@/components/fx-pro-trading/robots-page"
import TradesPage from "@/components/fx-pro-trading/trades-page"
import HistoryPage from "@/components/fx-pro-trading/history-page"
import BottomNavigation from "@/components/bottom-navifation"
import { Sidebar } from "@/components/sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { toast } from "sonner"
import { usePriceUpdates } from "@/hooks/use-price-updates"

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

export default function TradingApp() {
  const [currentPage, setCurrentPage] = useState("main")
  const [hasProFx, setHasProFx] = useState<boolean | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loginType, setLoginType] = useState<string>("real")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const mainRef = useRef<HTMLElement>(null)
  const router = useRouter()

  usePriceUpdates()

  const loadSession = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const raw = localStorage.getItem("user_session")

    if (!raw) {
      setIsLoggedIn(false)
      setUser(null)
      setActiveAccount(null)
      setError("No session data found. Please log in.")
      toast.error("No session data found. Please log in.")
      router.push("/login")
      setIsLoading(false)
      return
    }

    try {
      const data: User = JSON.parse(raw)
      if (!data || !data.accounts || !Array.isArray(data.accounts)) {
        throw new Error("Invalid session data: accounts missing or not an array")
      }

      const normalizedUser: User = {
        ...data,
        accounts: data.accounts.map((acc: Account) => ({
          ...acc,
          balance: Number(acc.balance) || 0,
        })),
      }

      setIsLoggedIn(true)
      setUser(normalizedUser)
      const activeId = localStorage.getItem("active_account_id")
      const account =
        normalizedUser.accounts.find((acc: Account) => acc.id === Number(activeId)) ||
        normalizedUser.accounts.find((acc: Account) => acc.account_type === "pro-fx") ||
        normalizedUser.accounts[0]

      if (!account) {
        throw new Error("No valid account found in session data")
      }

      setActiveAccount(account)
      setLoginType(account.account_type === "demo" ? "demo" : "real")

      const proFxAccount = normalizedUser.accounts.find((acc: Account) => acc.account_type === "pro-fx")
      if (!proFxAccount) {
        setHasProFx(false)
        setError("Pro-FX account required")
        toast.error("Pro-FX account required")
        router.push("/dashboard")
        return
      }
      setHasProFx(true)
    } catch (err: unknown) {
      setIsLoggedIn(false)
      setUser(null)
      setActiveAccount(null)
      setError((err as Error).message || "Failed to load session data. Please log in again.")
      toast.error((err as Error).message || "Failed to load session data. Please log in again.")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadSession()

    const handleSessionUpdate = () => {
      loadSession()
    }
    window.addEventListener("session-updated", handleSessionUpdate)
    return () => window.removeEventListener("session-updated", handleSessionUpdate)
  }, [loadSession])

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
      setError("Failed to switch account. Please try again.")
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

  if (isLoading || hasProFx === null) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>
  }

  if (error || hasProFx === false) {
    return null
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
        <Sidebar loginType={loginType} activeAccount={activeAccount} />
        <main ref={mainRef} className="flex-1 w-full overflow-auto md:pl-64 pb-24">
          {(() => {
            switch (currentPage) {
              case "main":
                return <MainPage />
              case "robots":
                return <RobotsPage setIsNavVisible={setIsNavVisible} />
              case "trades":
                return <TradesPage />
              case "history":
                return <HistoryPage />
              default:
                return <MainPage />
            }
          })()}
        </main>
      </div>
      <div
        className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl transition-transform duration-300 ease-out z-50 md:pl-64 ${
          isNavVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <BottomNavigation currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}
