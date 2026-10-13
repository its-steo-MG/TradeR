"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react"
import { getAccountData, logout } from "@/lib/api-helpers"

interface UserData {
  username: string
  email: string
  is_email_verified: boolean
  phone?: string
  kyc_status?: "pending" | "approved" | "rejected"
}

export default function ProfileHeader() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData()
        setUser(data.user)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) return <div className="rounded-xl p-6 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 animate-pulse"><div className="h-20 bg-slate-100 dark:bg-zinc-800 rounded-lg" /></div>
  if (!user) return null

  const initials = user.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="rounded-xl p-6 md:p-8 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-pink-500">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{user.username}</h1>
            <p className="text-slate-500 dark:text-zinc-400">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.is_email_verified && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">Email Verified</Badge>}
              {user.kyc_status === "approved" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">KYC Verified</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="border-slate-200 dark:border-zinc-700">
            <Settings className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="outline" size="sm" className="border-slate-200 dark:border-zinc-700 text-red-500" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
