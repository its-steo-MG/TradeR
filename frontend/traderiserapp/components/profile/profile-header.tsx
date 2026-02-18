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
}

export default function ProfileHeader() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData()
        setUser(data.user)
      } catch (error) {
        console.error("[v0] Failed to fetch user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 md:p-8 border border-slate-700/50 animate-pulse">
        <div className="h-20 bg-slate-700/30 rounded-lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const initials = user.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="glass-card rounded-xl p-6 md:p-8 border border-slate-700/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-pink-500/50">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{user.username}</h1>
            <p className="text-slate-400">{user.email}</p>
            <div className="flex gap-2 mt-2">
              {user.is_email_verified && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  Email Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="border-slate-700/50 hover:bg-slate-800/50 bg-transparent">
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700/50 hover:bg-slate-800/50 text-red-400 bg-transparent"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
