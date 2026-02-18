"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/lib/api"

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
}

interface UserRobot {
  robot: {
    id: number
  }
  purchased_at: string | null
}

interface RobotMarketplaceProps {
  balance: number
  onBalanceChange: (balance: number) => void
}

export function RobotMarketplace({ balance, onBalanceChange }: RobotMarketplaceProps) {
  const [robots, setRobots] = useState<Robot[]>([])
  const [ownedRobotIds, setOwnedRobotIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [loginType, setLoginType] = useState<"real" | "demo">("real")

  // Sync login type from localStorage
  useEffect(() => {
    const type = (localStorage.getItem("login_type") as "real" | "demo") || "real"
    setLoginType(type)
  }, [])

  // Fetch robots + owned status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [robotsRes, userRobotsRes] = await Promise.all([api.getRobots(), api.getUserRobots()])

        if (robotsRes.error) throw new Error(robotsRes.error)
        if (userRobotsRes.error) throw new Error(userRobotsRes.error)

        const ownedIds = new Set<number>(
          (userRobotsRes.data as UserRobot[])
            .filter((ur: UserRobot) => ur.purchased_at !== null)
            .map((ur: UserRobot) => ur.robot.id),
        )

        setRobots(robotsRes.data as Robot[])
        setOwnedRobotIds(ownedIds)
      } catch (err) {
        toast.error("Failed to load marketplace")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePurchaseRobot = async (robotId: number, priceStr: string) => {
    if (loginType === "demo") {
      toast.error("Purchasing is disabled in demo mode")
      return
    }

    const price = Number(priceStr)
    if (isNaN(price) || balance < price) {
      toast.error("Insufficient balance")
      return
    }

    setPurchasingId(robotId)

    try {
      const response = await api.purchaseRobot(robotId)
      if (response.error) throw new Error(response.error)

      const newBalance = balance - price
      onBalanceChange(newBalance)
      setOwnedRobotIds((prev) => new Set(prev).add(robotId))
      toast.success("Robot purchased successfully!")
    } catch (err) {
      toast.error("Purchase failed. Try again.")
    } finally {
      setPurchasingId(null)
    }
  }

  if (isLoading) {
    return <p className="text-white/60">Loading robots...</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {robots.map((robot) => {
        const priceNum = Number(robot.price)
        const effectivePrice = robot.effective_price ? Number(robot.effective_price) : priceNum
        const discountedPrice = robot.discounted_price ? Number(robot.discounted_price) : null
        const originalPrice = robot.original_price ? Number(robot.original_price) : priceNum
        const hasDiscount = discountedPrice !== null && discountedPrice < originalPrice
        const discountPercent = hasDiscount ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0

        const isOwned = ownedRobotIds.has(robot.id)
        const isDemoMode = loginType === "demo"

        return (
          <div
            key={robot.id}
            className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 flex flex-col relative overflow-hidden"
          >
            {hasDiscount && !isDemoMode && (
              <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                  <div className="absolute -top-3 -left-3 text-red-300/40 text-xl">💝</div>
                  <div className="absolute -bottom-3 -right-3 text-rose-300/40 text-xl">💝</div>
                  <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-red-600 text-white px-4 py-2 rounded-2xl font-bold shadow-2xl transform -rotate-3 border border-rose-300/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg animate-pulse">💕</span>
                      <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest font-black">Valentine</span>
                        <span className="text-lg leading-none">{discountPercent}% OFF</span>
                      </div>
                      <span className="text-lg animate-pulse">💕</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-600"></div>
                </div>
              </div>
            )}

            {robot.image && (
              <img
                src={robot.image || "/placeholder.svg"}
                alt={robot.name}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{robot.name}</h3>
              <p className="text-sm text-white/60 mb-4">{robot.description}</p>
              {robot.available_for_demo && <p className="text-xs text-green-400 mb-4">Available for demo</p>}
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/20">
              <div className="flex flex-col">
                {hasDiscount && !isDemoMode ? (
                  <>
                    <p className="text-sm text-white/40 line-through">${originalPrice.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-cyan-400">${discountedPrice.toFixed(2)}</p>
                      <span className="text-xs text-cyan-400 font-semibold">
                        SAVE ${(originalPrice - discountedPrice).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {isDemoMode ? "Free" : `$${effectivePrice.toFixed(2)}`}
                  </p>
                )}
              </div>
              <Button
                onClick={() => handlePurchaseRobot(robot.id, robot.effective_price || robot.price)}
                disabled={
                  isDemoMode ||
                  isOwned ||
                  purchasingId === robot.id ||
                  isNaN(effectivePrice) ||
                  (!isDemoMode && balance < effectivePrice)
                }
                className="bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50"
              >
                {purchasingId === robot.id
                  ? "Purchasing..."
                  : isOwned
                    ? "Owned"
                    : isDemoMode
                      ? "Demo Only"
                      : "Purchase"}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
