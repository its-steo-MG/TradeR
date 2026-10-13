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

interface RobotsResponse { error?: string; data?: Robot[] }
interface UserRobotsResponse { error?: string; data?: Array<{ robot: { id: number }; purchased_at?: string | null }> }
interface PurchaseResponse { error?: string; data?: { remaining_balance?: number | string; is_deriv_robot?: boolean; deriv_access_key?: string } }

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
    setLoginType(((localStorage.getItem("login_type") as "real" | "demo") || "real"))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [robotsRes, userRobotsRes] = await Promise.all([
          api.getRobots() as Promise<RobotsResponse>,
          api.getUserRobots() as Promise<UserRobotsResponse>,
        ])
        if (robotsRes.error) throw new Error(robotsRes.error)
        if (userRobotsRes.error) throw new Error(userRobotsRes.error)
        setRobots(robotsRes.data || [])
        setOwnedRobotIds(new Set((userRobotsRes.data || []).filter((ur) => ur.purchased_at !== null).map((ur) => ur.robot.id)))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load robots")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handlePurchaseRobot = async (robotId: number) => {
    if (loginType === "demo") return toast.error("Real purchases are disabled in demo mode.")
    setPurchasingId(robotId)
    try {
      const res = await (api.purchaseRobot(robotId) as Promise<PurchaseResponse>)
      if (res.error) throw new Error(res.error)
      if (res.data?.remaining_balance !== undefined) onBalanceChange(Number(res.data.remaining_balance))
      setOwnedRobotIds((prev) => new Set(prev).add(robotId))
      if (res.data?.is_deriv_robot && res.data.deriv_access_key) {
        setPurchasedKeys((prev) => ({ ...prev, [robotId]: res.data!.deriv_access_key! }))
        toast.success("Purchase successful!", { description: "Copy your Deriv access key below" })
      } else {
        toast.success("Robot purchased successfully!")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Purchase failed. Please try again.")
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

  if (isLoading) return <p className="text-slate-500 dark:text-zinc-400">Loading robots...</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {robots.map((robot) => {
        const effectivePrice = robot.effective_price ? Number(robot.effective_price) : Number(robot.price)
        const hasDiscount = robot.discounted_price && Number(robot.discounted_price) < Number(robot.price)
        const discountPercent = hasDiscount ? Math.round(((Number(robot.price) - Number(robot.discounted_price!)) / Number(robot.price)) * 100) : 0
        const isOwned = ownedRobotIds.has(robot.id)
        const isDemoMode = loginType === "demo"
        const accessKey = purchasedKeys[robot.id]

        return (
          <div key={robot.id} className="relative rounded-3xl p-6 overflow-hidden flex flex-col border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            {robot.is_deriv_robot && (
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1 rounded-full">DERIV PREMIUM</div>
              </div>
            )}
            {hasDiscount && !isDemoMode && !robot.is_deriv_robot && (
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500 text-white px-4 py-2 rounded-2xl font-bold">{discountPercent}% OFF</div>
              </div>
            )}

            {robot.image && <img src={robot.image} alt={robot.name} className="w-full h-40 object-cover rounded-2xl mb-4" />}
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">{robot.name}</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4 line-clamp-3">{robot.description}</p>
              {robot.available_for_demo && <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">Available for demo</p>}
              {robot.is_deriv_robot && <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">Purchase to get Deriv access key</p>}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {hasDiscount && !robot.is_deriv_robot ? (
                    <>
                      <p className="text-sm text-slate-400 line-through">${Number(robot.price).toFixed(2)}</p>
                      <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">${Number(robot.discounted_price).toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold">{isDemoMode ? "Free for Demo" : `$${effectivePrice.toFixed(2)}`}</p>
                  )}
                </div>
                {!isOwned ? (
                  <Button onClick={() => handlePurchaseRobot(robot.id)} disabled={purchasingId === robot.id || (!isDemoMode && balance < effectivePrice)} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl px-6 py-6 font-bold disabled:opacity-50">
                    {purchasingId === robot.id ? "Purchasing..." : robot.is_deriv_robot ? "Get access key" : "Buy Now"}
                  </Button>
                ) : (
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Owned ✓</div>
                )}
              </div>

              {isOwned && robot.is_deriv_robot && accessKey && (
                <div className="mt-4 p-4 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 font-medium">YOUR DERIV ACCESS KEY</p>
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl font-mono text-sm break-all border border-amber-200 dark:border-amber-800">
                    <span className="flex-1 select-all">{accessKey}</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(robot.id, accessKey)} className="text-amber-600 dark:text-amber-400">
                      {copiedId === robot.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
