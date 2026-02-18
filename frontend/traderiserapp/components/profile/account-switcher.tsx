"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Wallet } from "lucide-react"
import { getAccountData, switchAccountHelper } from "@/lib/api-helpers"

interface Account {
  id: number
  account_type: string
  balance: number
}

interface RawAccount {
  id: number
  account_type: string
  balance?: string | number | null
}

export default function AccountSwitcher() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccountData()
        setAccounts(
          (data.accounts || []).map((a: RawAccount) => ({
            id: a.id,
            account_type: a.account_type,
            balance: Number(a.balance ?? 0),
          })),
        )
        setActiveId(data.activeAccountId)
      } catch (error) {
        console.error("[v0] Failed to fetch accounts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  const handleSwitch = async (accountId: number) => {
    setSwitching(true)
    try {
      await switchAccountHelper(accountId)
      setActiveId(accountId)
    } catch (error) {
      console.error("[v0] Failed to switch account:", error)
    } finally {
      setSwitching(false)
    }
  }

  const getAccountColor = (type: string) => {
    const colors: Record<string, string> = {
      demo: "bg-blue-500/20 border-blue-500/50",
      standard: "bg-purple-500/20 border-purple-500/50",
      pro: "bg-amber-500/20 border-amber-500/50",
      "pro-fx": "bg-pink-500/20 border-pink-500/50",
      islamic: "bg-green-500/20 border-green-500/50",
      options: "bg-cyan-500/20 border-cyan-500/50",
      crypto: "bg-orange-500/20 border-orange-500/50",
    }
    return colors[type.toLowerCase()] || "bg-slate-500/20 border-slate-500/50"
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/30 border-slate-700/50 sticky top-8">
        <CardHeader>
          <CardTitle className="text-lg">Your Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-20 bg-slate-700/30 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50 sticky top-8">
      <CardHeader>
        <CardTitle className="text-lg">Your Accounts</CardTitle>
        <CardDescription>Switch between trading accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => handleSwitch(account.id)}
            disabled={switching}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
              activeId === account.id
                ? `${getAccountColor(account.account_type)} ring-2 ring-pink-500/50`
                : "bg-slate-700/20 border-slate-700/30 hover:bg-slate-700/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white capitalize">{account.account_type}</span>
              {activeId === account.id && <Badge className="bg-pink-500 text-white">Active</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Wallet className="w-4 h-4" />
              <span>${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </button>
        ))}
        <Button className="w-full mt-4 bg-pink-600 hover:bg-pink-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Account
        </Button>
      </CardContent>
    </Card>
  )
}
