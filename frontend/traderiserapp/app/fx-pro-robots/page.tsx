// app/fx-pro-robots/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import type { Account } from "@/types/account"
import { api } from "@/lib/api"
import { Zap, ShoppingCart, Play, Pause, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

export type LoginType = "real" | "demo"

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
  is_ea?: boolean
  max_open_positions?: number
}

interface UserRobot {
  id: number
  user: number
  robot: ForexRobot
  is_running: boolean
  purchased_at: string
  last_trade_time?: string
  is_ea?: boolean
  max_open_positions?: number
}

export default function FxProRobotsPage() {
  const [robots, setRobots] = useState<ForexRobot[]>([])
  const [myRobots, setMyRobots] = useState<UserRobot[]>([])
  const [activeTab, setActiveTab] = useState<"available" | "purchased">("available")
  const [loading, setLoading] = useState(true)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [purchasedRobotIds, setPurchasedRobotIds] = useState<Set<number>>(new Set())

  const loadInitialData = useCallback(async () => {
    const loginTypeStored =
      (localStorage.getItem("login_type") as "real" | "demo" | null) ?? "real"
    const accountType = localStorage.getItem("account_type")
    const userSessionStr = localStorage.getItem("user_session")

    setLoginType(loginTypeStored)

    if (userSessionStr) {
      try {
        const userSession = JSON.parse(userSessionStr) as {
          accounts?: Array<Account>
        }
        const currentAccount =
          userSession?.accounts?.find((acc) => acc.account_type === accountType) ??
          userSession?.accounts?.[0] ??
          null
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

  const fetchRobots = useCallback(async () => {
    try {
      const [availableRes, purchasedRes] = await Promise.all([
        api.getForexRobots(),
        api.getMyForexRobots(),
      ])

      if (availableRes.data?.robots) {
        // Pro-FX page: ONLY non-EA robots (EA robots live on /ea-robots)
        const normalized: ForexRobot[] = availableRes.data.robots
          .filter((r: { is_ea?: boolean }) => !r.is_ea)
          .map((r: {
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
            is_ea?: boolean
            max_open_positions?: number
          }) => ({
            id: r.id,
            name: r.name,
            image: r.image_url ?? r.image,
            description: r.description ?? "No description",
            price: Number(r.price),
            discounted_price: r.discounted_price
              ? Number(r.discounted_price)
              : undefined,
            original_price: r.original_price
              ? Number(r.original_price)
              : Number(r.price),
            effective_price: r.effective_price
              ? Number(r.effective_price)
              : Number(r.price),
            win_rate_normal: Number(r.win_rate_normal ?? 0),
            win_rate_sashi: Number(r.win_rate_sashi ?? 0),
            is_ea: false,
            max_open_positions: r.max_open_positions || 2,
          }))
        setRobots(normalized)
      }

      const purchasedRobotsList = purchasedRes.data?.user_robots ?? []
      // Pro-FX page: only show non-EA purchased robots
      const normalizedMyRobots: UserRobot[] = purchasedRobotsList
        .filter(
          (ur: { is_ea?: boolean; robot?: { is_ea?: boolean } }) =>
            !(ur.is_ea || ur.robot?.is_ea)
        )
        .map((ur: {
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
            is_ea?: boolean
            max_open_positions?: number
          }
          is_running: boolean
          purchased_at: string
          last_trade_time?: string
          is_ea?: boolean
          max_open_positions?: number
        }) => ({
          id: ur.id,
          user: ur.user,
          robot: {
            id: ur.robot.id,
            name: ur.robot.name,
            image: ur.robot.image_url ?? ur.robot.image,
            description: ur.robot.description ?? "No description",
            price: Number(ur.robot.price),
            discounted_price: ur.robot.discounted_price
              ? Number(ur.robot.discounted_price)
              : undefined,
            original_price: ur.robot.original_price
              ? Number(ur.robot.original_price)
              : Number(ur.robot.price),
            effective_price: ur.robot.effective_price
              ? Number(ur.robot.effective_price)
              : Number(ur.robot.price),
            win_rate_normal: Number(ur.robot.win_rate_normal ?? 0),
            win_rate_sashi: Number(ur.robot.win_rate_sashi ?? 0),
            is_ea: false,
            max_open_positions:
              ur.robot.max_open_positions || ur.max_open_positions || 2,
          },
          is_running: ur.is_running,
          purchased_at: ur.purchased_at,
          last_trade_time: ur.last_trade_time,
          is_ea: false,
          max_open_positions:
            ur.robot.max_open_positions || ur.max_open_positions || 2,
        }))

      setMyRobots(normalizedMyRobots)
      setPurchasedRobotIds(new Set(normalizedMyRobots.map((ur) => ur.robot.id)))
    } catch (error) {
      const err = error as Error
      console.error("Failed to fetch robots:", err)
      toast.error(`Failed to load robots: ${err.message || "Please try again"}`)
    }
  }, [])

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

  const handleToggleRobot = async (userRobotId: number) => {
    try {
      const userRobot = myRobots.find((ur) => ur.id === userRobotId)
      if (!userRobot) {
        toast.error("Robot not found")
        return
      }

      const toggleResponse = await api.toggleForexRobot(userRobotId)
      if (toggleResponse.error) {
        toast.error(`Toggle failed: ${toggleResponse.error}`)
        return
      }

      const isNowRunning = toggleResponse.data?.is_running ?? false
      toast.success(isNowRunning ? "Robot started" : "Robot stopped")
      await fetchRobots()
    } catch (error) {
      console.error("Toggle error:", error)
      toast.error("Failed to toggle robot")
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchRobots()
    setLoading(false)
    toast.success("Data refreshed")
  }

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-8 h-8 text-pink-500" />
                <h1 className="text-3xl font-bold">FX Pro Robots</h1>
              </div>
              <p className="text-white/60">
                Buy and manage Pro-FX automated trading bots (non-EA)
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="drop-on-top relative p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh data"
            >
              <span className="relative z-[1]">
                <RefreshCw className="w-6 h-6" />
              </span>
            </button>
          </div>

          <div className="flex gap-2 mb-8 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10">
            <button
              onClick={() => setActiveTab("available")}
              className={`
                relative flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all
                ${
                  activeTab === "available"
                    ? "drop-on-top bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className="relative z-[1]">Available Robots</span>
            </button>

            <button
              onClick={() => setActiveTab("purchased")}
              className={`
                relative flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all
                ${
                  activeTab === "purchased"
                    ? "drop-on-top bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className="relative z-[1]">
                My Robots ({myRobots.length})
              </span>
            </button>
          </div>

          {activeTab === "available" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {robots.length > 0 ? (
                robots.map((robot) => {
                  const isOwned = purchasedRobotIds.has(robot.id)
                  const winRate =
                    loginType === "demo"
                      ? robot.win_rate_normal
                      : robot.win_rate_sashi
                  const hasDiscount =
                    robot.discounted_price != null && robot.discounted_price > 0
                  const discountPercent = hasDiscount
                    ? Math.round(
                        ((robot.price - robot.discounted_price!) / robot.price) *
                          100
                      )
                    : 0

                  return (
                    <div
                      key={robot.id}
                      className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 overflow-hidden"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[35%] pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)",
                        }}
                      />

                      {hasDiscount && (
                        <div className="drop-on-top absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                          <span className="relative z-[1] flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            SPECIAL OFFER - {discountPercent}% OFF
                          </span>
                        </div>
                      )}

                      {robot.image && (
                        <img
                          src={robot.image || "/placeholder.svg"}
                          alt={robot.name}
                          className="w-full h-40 object-cover"
                        />
                      )}

                      <div className="relative z-[1] p-6">
                        <h3 className="text-xl font-bold mb-2">{robot.name}</h3>
                        <p className="text-white/70 text-sm mb-4 line-clamp-2">
                          {robot.description}
                        </p>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Price:</span>
                            {hasDiscount ? (
                              <div className="flex items-center gap-2">
                                <span className="text-white/40 line-through text-sm">
                                  ${robot.price.toFixed(2)}
                                </span>
                                <span className="font-bold text-green-400 text-lg">
                                  ${robot.discounted_price!.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-pink-400">
                                ${robot.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Win Rate:</span>
                            <span className="font-bold text-green-400">
                              {winRate}%
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePurchaseRobot(robot.id)}
                          disabled={isOwned}
                          className={`
                            drop-on-top relative w-full py-2.5 rounded-xl font-medium
                            flex items-center justify-center gap-2 transition-all
                            ${
                              isOwned
                                ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                                : "bg-pink-500 hover:bg-pink-600 text-white"
                            }
                          `}
                        >
                          <span className="relative z-[1] flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            {isOwned ? "Already Owned" : "Purchase Robot"}
                          </span>
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

          {activeTab === "purchased" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRobots.length > 0 ? (
                myRobots.map((userRobot) => {
                  const winRate =
                    loginType === "demo"
                      ? userRobot.robot.win_rate_normal
                      : userRobot.robot.win_rate_sashi
                  const wasPurchasedOnSale =
                    userRobot.robot.discounted_price != null &&
                    userRobot.robot.discounted_price > 0

                  return (
                    <div
                      key={userRobot.id}
                      className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 overflow-hidden"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[35%] pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)",
                        }}
                      />

                      {wasPurchasedOnSale && (
                        <div className="drop-on-top absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500/80 to-orange-600/80 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <span className="relative z-[1] flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            SPECIAL OFFER
                          </span>
                        </div>
                      )}

                      {userRobot.robot.image && (
                        <img
                          src={userRobot.robot.image || "/placeholder.svg"}
                          alt={userRobot.robot.name}
                          className="w-full h-40 object-cover"
                        />
                      )}

                      <div className="relative z-[1] p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">
                              {userRobot.robot.name}
                            </h3>
                            <p className="text-white/60 text-sm">
                              Purchased:{" "}
                              {new Date(
                                userRobot.purchased_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              userRobot.is_running
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {userRobot.is_running ? "Running" : "Stopped"}
                          </span>
                        </div>

                        <p className="text-white/70 text-sm mb-4">
                          {userRobot.robot.description}
                        </p>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60">Win Rate:</span>
                            <span className="font-bold text-green-400">
                              {winRate}%
                            </span>
                          </div>
                          {userRobot.last_trade_time && (
                            <div className="flex justify-between items-center">
                              <span className="text-white/60">Last Trade:</span>
                              <span className="text-sm">
                                {new Date(
                                  userRobot.last_trade_time
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleRobot(userRobot.id)}
                          className={`
                            drop-on-top relative w-full py-2.5 rounded-xl font-medium
                            flex items-center justify-center gap-2 transition-all
                            ${
                              userRobot.is_running
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                            }
                          `}
                        >
                          <span className="relative z-[1] flex items-center gap-2">
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
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/70">
                    You have not purchased any robots yet
                  </p>
                  <button
                    onClick={() => setActiveTab("available")}
                    className="drop-on-top relative mt-4 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-xl font-medium transition-all"
                  >
                    <span className="relative z-[1]">Browse Available Robots</span>
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
