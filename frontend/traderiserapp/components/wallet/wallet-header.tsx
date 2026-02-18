"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export function WalletHeader() {
  const [username, setUsername] = useState("User")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.getAccount()
        const data = (res.data as { user?: { username?: string } } | undefined) ?? undefined
        const username = data?.user?.username
        if (!res.error && username) {
          setUsername(username)
        }
      } catch (err) {
        console.warn("Could not load user name:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return (
    <div className="space-y-2">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">Welcome Back,</h1>
      <p className="text-lg sm:text-xl text-slate-600 font-medium capitalize">{loading ? "…" : username}</p>
    </div>
  )
}