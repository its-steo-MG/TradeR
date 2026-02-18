// app/fx-pro-robots/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import type { Account } from "@/types/account"
import { api } from "@/lib/api"
import { Zap, ShoppingCart, Play, Pause, RefreshCw, Sparkles, Gift } from "lucide-react"
import { toast } from "sonner"

export type LoginType = "real" | "demo"

/* ----------  Domain types ---------- */
interface ForexRobot {
  id: number
  name: string
  image?: string
  description: string
  price: number
  discounted_price?: number
  original_price?: number
  effective_price: number
  win_rate_normal: number
  win_rate_sashi: number
}

interface UserRobot {
  id: number
  user: number
  robot: ForexRobot
  is_running: boolean
  purchased_at: string
  last_trade_time?: string
}

/* ----------  API response shapes ---------- */
interface ForexRobotsResponse {
  robots: Array<{
    id: number
    name: string
    image_url?: string
    image?: string
    description?: string
    price: string | number
    discounted_price?: string | number
    original_price?: string | number
    effective_price?: string | number
    win_rate_normal?: string | number
    win_rate_sashi?: string | number
  }>
}

interface MyForexRobotsResponse {
  user_robots: Array<{
    id: number
    user: number
    robot: {
      id: number
      name: string
      image_url?: string
      image?: string
      description?: string
      price: string | number
      discounted_price?: string | number
      original_price?: string | number
      effective_price?: string | number
      win_rate_normal?: string | number
      win_rate_sashi?: string | number
    }
    is_running: boolean
    purchased_at: string
    last_trade_time?: string
  }>
}

/* ----------  Component ---------- */
export default function FxProRobotsPage() {
  const [robots, setRobots] = useState<ForexRobot[]>([])
  const [myRobots, setMyRobots] = useState<UserRobot[]>([])
  const [activeTab, setActiveTab] = useState<"available" | "purchased">("available")
  const [loading, setLoading] = useState(true)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [purchasedRobotIds, setPurchasedRobotIds] = useState<Set<number>>(new Set())

  /* ----------  Load initial data ---------- */
  const loadInitialData = useCallback(async () => {
    const loginTypeStored = (localStorage.getItem("login_type") as "real" | "demo" | null) ?? "real"
    const accountType = localStorage.getItem("account_type")
    const userSessionStr = localStorage.getItem("user_session")

    setLoginType(loginTypeStored)

    if (userSessionStr) {
      try {
        const userSession = JSON.parse(userSessionStr) as { accounts?: Array<Account> }
        const currentAccount =
          userSession?.accounts?.find((acc) => acc.account_type === accountType) ?? userSession?.accounts?.[0] ?? null
        setActiveAccount(currentAccount)
      } catch (err) {
        console.error("Failed to parse user session:", err)
      }
    }

    await fetchRobots()
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  /* ----------  Fetch robots ---------- */
  const fetchRobots = useCallback(async () => {
    try {
      const [availableRes, purchasedRes] = await Promise.all([api.getForexRobots(), api.getMyForexRobots()])

      /* ---- Available robots ---- */
      if (availableRes.data?.robots) {
        const normalized: ForexRobot[] = availableRes.data.robots.map((r) => ({
          id: r.id,
          name: r.name,
          image: r.image_url ?? r.image,
          description: r.description ?? "No description",
          price: Number(r.price),
          discounted_price: r.discounted_price ? Number(r.discounted_price) : undefined,
          original_price: r.original_price ? Number(r.original_price) : Number(r.price),
          effective_price: r.effective_price ? Number(r.effective_price) : Number(r.price),
          win_rate_normal: Number(r.win_rate_normal ?? 0),
          win_rate_sashi: Number(r.win_rate_sashi ?? 0),
        }))
        setRobots(normalized)
      }

      /* ---- Purchased robots ---- */
      const purchasedRobotsList = purchasedRes.data?.user_robots ?? []
      const normalizedMyRobots: UserRobot[] = purchasedRobotsList.map((ur) => ({
        id: ur.id,
        user: ur.user,
        robot: {
          id: ur.robot.id,
          name: ur.robot.name,
          image: ur.robot.image_url ?? ur.robot.image,
          description: ur.robot.description ?? "No description",
          price: Number(ur.robot.price),
          discounted_price: ur.robot.discounted_price ? Number(ur.robot.discounted_price) : undefined,
          original_price: ur.robot.original_price ? Number(ur.robot.original_price) : Number(ur.robot.price),
          effective_price: ur.robot.effective_price ? Number(ur.robot.effective_price) : Number(ur.robot.price),
          win_rate_normal: Number(ur.robot.win_rate_normal ?? 0),
          win_rate_sashi: Number(ur.robot.win_rate_sashi ?? 0),
        },
        is_running: ur.is_running,
        purchased_at: ur.purchased_at,
        last_trade_time: ur.last_trade_time,
      }))

      setMyRobots(normalizedMyRobots)
      setPurchasedRobotIds(new Set(normalizedMyRobots.map((ur) => ur.robot.id)))
    } catch (error) {
      const err = error as Error
      console.error("Failed to fetch robots:", err)
      toast.error(`Failed to load robots: ${err.message || "Please try again"}`)
    }
  }, [])

  /* ----------  Handlers ---------- */
  const handlePurchaseRobot = async (robotId: number) => {
    try {
      const response = await api.purchaseForexRobot(robotId)
      if (response.error) {
        toast.error(`Purchase failed: ${response.error}`)
        return
      }
      toast.success("Robot purchased successfully!")
      await fetchRobots()
      setActiveTab("purchased")
    } catch (error) {
      const err = error as Error
      console.error("Purchase error:", err)
      toast.error(`Purchase failed: ${err.message || "Network error"}`)
    }
  }

  const handleToggleRobot = async (userRobotId: number, currentState: boolean) => {
    try {
      const response = await api.toggleForexRobot(userRobotId)
      if (response.error) {
        toast.error(`Toggle failed: ${response.error}`)
        return
      }
      toast.success(currentState ? "Robot stopped" : "Robot started")
      await fetchRobots()
    } catch (error) {
      const err = error as Error
      console.error("Toggle error:", err)
      toast.error(`Failed to toggle robot: ${err.message}`)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchRobots()
    setLoading(false)
    toast.success("Data refreshed")
  }

  /* ----------  Render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar loginType={loginType} activeAccount={activeAccount} />

      <main className="flex-1 overflow-y-auto md:ml-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-8 h-8 text-pink-500" />
                <h1 className="text-3xl font-bold">FX Pro Robots</h1>
              </div>
              <p className="text-white/60">Buy and manage automated trading bots</p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab("available")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "available"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Available Robots
            </button>
            <button
              onClick={() => setActiveTab("purchased")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "purchased"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-white/60 hover:text-white"
              }`}
            >
              My Robots ({myRobots.length})
            </button>
          </div>

          {/* Available Robots */}
          {activeTab === "available" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {robots.length > 0 ? (
                robots.map((robot) => {
                  const isOwned = purchasedRobotIds.has(robot.id)
                  const winRate = loginType === "demo" ? robot.win_rate_normal : robot.win_rate_sashi
                  const hasDiscount = robot.discounted_price != null && robot.discounted_price > 0
                  const discountPercent = hasDiscount
                    ? Math.round(((robot.price - robot.discounted_price!) / robot.price) * 100)
                    : 0

                  return (
                    <div
                      key={robot.id}
                      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-white/10 overflow-hidden relative"
                    >
                      {hasDiscount && (
                        <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                          <span className="text-base">💕</span>
                          <span>Valentine Deal {discountPercent}% OFF</span>
                          <span className="text-base">💕</span>
                        </div>
                      )}

                      {robot.image && (
                        <img
                          src={robot.image || "/placeholder.svg"}
                          alt={robot.name}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2">{robot.name}</h3>
                        <p className="text-white/70 text-sm mb-4 line-clamp-2">{robot.description}</p>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Price:</span>
                            {hasDiscount ? (
                              <div className="flex items-center gap-2">
                                <span className="text-white/40 line-through text-sm">${robot.price.toFixed(2)}</span>
                                <span className="font-bold text-green-400 text-lg">
                                  ${robot.discounted_price!.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-pink-400">${robot.price.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Win Rate:</span>
                            <span className="font-bold text-green-400">{winRate}%</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePurchaseRobot(robot.id)}
                          disabled={isOwned}
                          className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                            isOwned
                              ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                              : "bg-pink-500 hover:bg-pink-600 text-white"
                          }`}
                        >
                          {isOwned ? (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Already Owned
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Purchase Robot
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/70">No robots available at the moment</p>
                </div>
              )}
            </div>
          )}

          {/* Purchased Robots */}
          {activeTab === "purchased" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRobots.length > 0 ? (
                myRobots.map((userRobot) => {
                  const winRate =
                    loginType === "demo" ? userRobot.robot.win_rate_normal : userRobot.robot.win_rate_sashi
                  const wasPurchasedOnSale =
                    userRobot.robot.discounted_price != null && userRobot.robot.discounted_price > 0

                  return (
                    <div
                      key={userRobot.id}
                      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-white/10 overflow-hidden relative"
                    >
                      {wasPurchasedOnSale && (
                        <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-rose-500/80 to-pink-600/80 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <span>💕</span>
                          <span>Valentine Deal</span>
                        </div>
                      )}

                      {userRobot.robot.image && (
                        <img
                          src={userRobot.robot.image || "/placeholder.svg"}
                          alt={userRobot.robot.name}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{userRobot.robot.name}</h3>
                            <p className="text-white/60 text-sm">
                              Purchased: {new Date(userRobot.purchased_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              userRobot.is_running ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {userRobot.is_running ? "Running" : "Stopped"}
                          </span>
                        </div>

                        <p className="text-white/70 text-sm mb-4">{userRobot.robot.description}</p>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Win Rate:</span>
                            <span className="font-bold text-green-400">{winRate}%</span>
                          </div>
                          {userRobot.last_trade_time && (
                            <div className="flex justify-between items-center">
                              <span className="text-white/60">Last Trade:</span>
                              <span className="text-sm">{new Date(userRobot.last_trade_time).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleRobot(userRobot.id, userRobot.is_running)}
                          className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                            userRobot.is_running
                              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                              : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                          }`}
                        >
                          {userRobot.is_running ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Stop Robot
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Start Robot
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/70">You have not purchased any robots yet</p>
                  <button
                    onClick={() => setActiveTab("available")}
                    className="mt-4 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-all"
                  >
                    Browse Available Robots
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
