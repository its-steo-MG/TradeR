// app/robots/layout.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
  phone: string
  is_sashi: boolean
  is_email_verified: boolean
  accounts: Account[]
}

interface RobotsLayoutProps {
  children: React.ReactNode
}

export default function RobotsLayout({ children }: RobotsLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSession = () => {
      setIsLoading(true)
      setError(null)
      const raw = localStorage.getItem("user_session")

      if (!raw) {
        setIsLoggedIn(false)
        setUser(null)
        setActiveAccount(null)
        setError("No session data found. Please log in.")
        setIsLoading(false)
        toast.error("No session data found. Please log in.")
        window.location.href = "/login"
        return
      }

      try {
        const data: User = JSON.parse(raw)
        if (!data?.accounts?.length) {
          throw new Error("Invalid session data: accounts missing")
        }

        const normalizedUser: User = {
          ...data,
          accounts: data.accounts.map((a) => ({
            ...a,
            balance: Number(a.balance) || 0,
          })),
        }

        setIsLoggedIn(true)
        setUser(normalizedUser)

        const activeId = localStorage.getItem("active_account_id")
        const account =
          normalizedUser.accounts.find((a) => a.id === Number(activeId)) ||
          normalizedUser.accounts.find((a) => a.account_type === "standard") ||
          normalizedUser.accounts[0]

        if (!account) throw new Error("No valid account found")

        setActiveAccount(account)
        setLoginType(account.account_type === "demo" ? "demo" : "real")
      } catch (e) {
        console.error(e)
        setIsLoggedIn(false)
        setUser(null)
        setActiveAccount(null)
        setError("Failed to load session. Please log in again.")
        toast.error("Failed to load session. Please log in again.")
        window.location.href = "/login"
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
    window.addEventListener("session-updated", loadSession)
    return () => window.removeEventListener("session-updated", loadSession)
  }, [])

  const handleSwitchAccount = (account: Account) => {
    if (!account) return

    try {
      localStorage.setItem("active_account_id", account.id.toString())
      localStorage.setItem("account_type", account.account_type)
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real")

      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((a) =>
          a.id === account.id ? { ...a, balance: Number(account.balance) || 0 } : a,
        ),
      }

      setUser(updatedUser)
      setActiveAccount(account)
      setLoginType(account.account_type === "demo" ? "demo" : "real")

      localStorage.setItem("user_session", JSON.stringify(updatedUser))
      window.dispatchEvent(new Event("session-updated"))
    } catch (e) {
      console.error(e)
      toast.error("Failed to switch account")
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUser(null)
    setActiveAccount(null)
    window.location.href = "/login"
  }

  // ---- SAME FILTERING LOGIC AS DASHBOARD ----
  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((a) => a.account_type !== "demo")
      : (user?.accounts || []).filter((a) => a.account_type === "demo")

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>
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
        <main className="flex-1 w-full overflow-auto md:pl-64">{children}</main>
      </div>
    </div>
  )
}
