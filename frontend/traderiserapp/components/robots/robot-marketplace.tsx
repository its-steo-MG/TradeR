// components/robots/robot-marketplace.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Copy, Check } from "lucide-react"

interface Robot {
  id: number
  name: string
  description: string
  price: string
  discounted_price?: string | null
  original_price?: string
  effective_price?: string
  available_for_demo: boolean
  image?: string
  is_deriv_robot: boolean
  deriv_access_key?: string
}

interface UserRobot {
  robot: {
    id: number
  }
  purchased_at?: string | null
}

interface RobotsResponse {
  error?: string
  data?: Robot[]
}

interface UserRobotsResponse {
  error?: string
  data?: Array<{
    robot: { id: number }
    purchased_at?: string | null
  }>
}

interface PurchaseResponse {
  error?: string
  data?: {
    remaining_balance?: number | string
    is_deriv_robot?: boolean
    deriv_access_key?: string
  }
}

interface RobotMarketplaceProps {
  balance: number
  onBalanceChange: (balance: number) => void
}

export function RobotMarketplace({ balance, onBalanceChange }: RobotMarketplaceProps) {
  const [robots, setRobots] = useState<Robot[]>([])
  const [ownedRobotIds, setOwnedRobotIds] = useState<Set<number>>(new Set())
  const [purchasedKeys, setPurchasedKeys] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")

  useEffect(() => {
    const type = (localStorage.getItem("login_type") as "real" | "demo") || "real"
    setLoginType(type)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [robotsRes, userRobotsRes] = await Promise.all([
          api.getRobots() as Promise<RobotsResponse>,
          api.getUserRobots() as Promise<UserRobotsResponse>
        ])

        if (robotsRes.error) throw new Error(robotsRes.error)
        if (userRobotsRes.error) throw new Error(userRobotsRes.error)

        const ownedIds = new Set<number>(
          (userRobotsRes.data || [])
            .filter((ur) => ur.purchased_at !== null)
            .map((ur) => ur.robot.id)
        )

        setRobots(robotsRes.data || [])
        setOwnedRobotIds(ownedIds)
      } catch (err: unknown) {
        console.error(err)
        const message = err instanceof Error ? err.message : "Failed to load robots"
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePurchaseRobot = async (robotId: number) => {
    const isDemoMode = loginType === "demo"

    if (isDemoMode) {
      toast.error("Real purchases are disabled in demo mode. Use demo robots only.")
      return
    }

    setPurchasingId(robotId)

    try {
      const response = await api.purchaseRobot(robotId) as Promise<PurchaseResponse>
      const res = await response

      if (res.error) throw new Error(res.error)

      const data = res.data

      if (data?.remaining_balance !== undefined) {
        onBalanceChange(Number(data.remaining_balance))
      }

      setOwnedRobotIds((prev) => new Set(prev).add(robotId))

      if (data?.is_deriv_robot && data.deriv_access_key) {
        setPurchasedKeys((prev) => ({ ...prev, [robotId]: data.deriv_access_key! }))
        toast.success("✅ Purchase successful!", {
          description: "Copy your Deriv access key below",
        })
      } else {
        toast.success("Robot purchased successfully!")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed. Please try again."
      toast.error(message)
    } finally {
      setPurchasingId(null)
    }
  }

  const copyToClipboard = (robotId: number, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(robotId)
    toast.success("Access key copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return <p className="text-white/60">Loading robots...</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {robots.map((robot) => {
        const effectivePrice = robot.effective_price
          ? Number(robot.effective_price)
          : Number(robot.price)

        const hasDiscount =
          robot.discounted_price &&
          Number(robot.discounted_price) < Number(robot.price)

        const discountPercent = hasDiscount
          ? Math.round(
              ((Number(robot.price) - Number(robot.discounted_price!)) /
                Number(robot.price)) *
                100
            )
          : 0

        const isOwned = ownedRobotIds.has(robot.id)
        const isDemoMode = loginType === "demo"
        const accessKey = purchasedKeys[robot.id]

        return (
          <div
            key={robot.id}
            className="relative rounded-3xl p-6 overflow-hidden flex flex-col shadow-2xl transition-all duration-300"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            {/* Soft top water-drop highlight */}
            <div
              className="absolute inset-x-0 top-0 h-[40%] pointer-events-none rounded-t-3xl"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)",
              }}
            />

            {/* Deriv Premium Badge */}
            {robot.is_deriv_robot && (
              <div className="absolute top-4 left-4 z-10">
                <div className="drop-on-top relative bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <span className="relative z-[1]">🔑 DERIV PREMIUM</span>
                </div>
              </div>
            )}

            {/* Discount Banner */}
            {hasDiscount && !isDemoMode && !robot.is_deriv_robot && (
              <div className="absolute top-4 right-4 z-10">
                <div className="drop-on-top relative bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500 text-white px-5 py-2.5 rounded-3xl font-bold shadow-2xl transform -rotate-3 border border-white/30">
                  <span className="relative z-[1]">{discountPercent}% OFF</span>
                </div>
              </div>
            )}

            <div className="relative z-[1] flex flex-col flex-1">
              {robot.image && (
                <img
                  src={robot.image}
                  alt={robot.name}
                  className="w-full h-40 object-cover rounded-2xl mb-4"
                />
              )}

              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{robot.name}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-3">{robot.description}</p>

                {robot.available_for_demo && (
                  <p className="text-xs text-emerald-400 mb-4 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Available for demo
                  </p>
                )}

                {robot.is_deriv_robot && (
                  <p className="text-xs text-amber-400 mb-4 flex items-center gap-1">
                    <span>🔑</span> Purchase to get Deriv access key
                  </p>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/15">
                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {hasDiscount && !robot.is_deriv_robot ? (
                      <>
                        <p className="text-sm text-white/40 line-through">
                          ${Number(robot.price).toFixed(2)}
                        </p>
                        <p className="text-2xl font-bold text-cyan-400">
                          ${Number(robot.discounted_price).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-white">
                        {isDemoMode ? "Free for Demo" : `$${effectivePrice.toFixed(2)}`}
                      </p>
                    )}
                  </div>

                  {/* Buy / Owned */}
                  {!isOwned ? (
                    <Button
                      onClick={() => handlePurchaseRobot(robot.id)}
                      disabled={
                        purchasingId === robot.id ||
                        (!isDemoMode && balance < effectivePrice)
                      }
                      className="
                        drop-on-top
                        relative bg-gradient-to-r from-pink-500 to-purple-600
                        hover:from-pink-600 hover:to-purple-700
                        text-white rounded-2xl px-8 py-6 font-bold text-base
                        shadow-lg disabled:opacity-50
                      "
                    >
                      <span className="relative z-[1]">
                        {purchasingId === robot.id
                          ? "Purchasing..."
                          : robot.is_deriv_robot
                          ? "Purchase to get access key"
                          : "Buy Now"}
                      </span>
                    </Button>
                  ) : (
                    <div className="text-emerald-400 font-semibold flex items-center gap-2 text-lg">
                      Owned ✓
                    </div>
                  )}
                </div>

                {/* Deriv Access Key */}
                {isOwned && robot.is_deriv_robot && accessKey && (
                  <div
                    className="mt-4 p-4 rounded-2xl border border-amber-500/30"
                    style={{
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <p className="text-xs text-amber-400 mb-2 font-medium">
                      YOUR DERIV ACCESS KEY
                    </p>
                    <div className="flex items-center gap-3 bg-black/60 p-3 rounded-xl font-mono text-sm break-all border border-amber-400/20">
                      <span className="flex-1 select-all">{accessKey}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(robot.id, accessKey)}
                        className="drop-on-top relative text-amber-400 hover:text-amber-300 p-2"
                      >
                        <span className="relative z-[1]">
                          {copiedId === robot.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </span>
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-2">
                      Copy and paste this key into your Deriv bot configuration
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}