"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/format-currency"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { EliteConfigPanel } from "./elite-config-panel"

interface Robot {
  id: number
  name: string
  description: string
  price: string
  image?: string
  is_deriv_robot?: boolean
  is_elite_robot?: boolean          // ← NEW
  effective_price?: string
}

interface UserRobot {
  id: number
  robot: Robot
  purchased_at: string | null
  purchased_price?: string
  deriv_access_key?: string
}

export function UserRobots() {
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    const fetchUserRobots = async () => {
      try {
        const { data, error } = await api.getUserRobots()
        if (error) throw new Error(error)
        setUserRobots(data as UserRobot[])
      } catch (err) {
        console.error("Failed to load user robots:", err)
        toast.error("Failed to load your robots")
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserRobots()
  }, [])

  const copyToClipboard = (id: number, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    toast.success("Access key copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return <p className="text-white/60">Loading your robots...</p>
  }

  if (userRobots.length === 0) {
    return (
      <div
        className="relative rounded-2xl p-12 text-center overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[40%] pointer-events-none rounded-t-2xl"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, transparent 100%)",
          }}
        />
        <div className="relative z-[1]">
          <p className="text-white/60 mb-4">You have not purchased any robots yet</p>
          <p className="text-sm text-white/40">
            Head to the Marketplace tab to start trading with our robots
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userRobots.map((userRobot) => {
        const { robot, purchased_at, deriv_access_key } = userRobot
        const purchaseDate = purchased_at
          ? new Date(purchased_at).toLocaleDateString()
          : "Unknown"

        const isDerivRobot = robot.is_deriv_robot || !!deriv_access_key
        const isElite = !!robot.is_elite_robot

        return (
          <div
            key={userRobot.id}
            className={`relative rounded-3xl p-6 flex flex-col overflow-hidden ${
              isElite ? "ring-2 ring-amber-500/50" : ""
            }`}
            style={{
              background: isElite
                ? "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(255,255,255,0.06) 100%)"
                : "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: isElite
                ? "1px solid rgba(251,191,36,0.35)"
                : "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            {/* Soft top highlight */}
            <div
              className="absolute inset-x-0 top-0 h-[40%] pointer-events-none rounded-t-3xl"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.16) 0%, transparent 100%)",
              }}
            />

            <div className="relative z-[1] flex flex-col flex-1">
              {robot.image && (
                <img
                  src={robot.image}
                  alt={robot.name}
                  className="w-full h-40 object-cover rounded-2xl mb-4"
                />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{robot.name}</h3>
                  {isElite && (
                    <span className="text-xs bg-amber-500/25 text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                      ★ ELITE
                    </span>
                  )}
                  {isDerivRobot && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                      DERIV PREMIUM
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mb-4">{robot.description}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-white/15 space-y-4">
                <div>
                  <p className="text-sm text-white/40">Purchased</p>
                  <p className="text-white font-medium">{purchaseDate}</p>
                </div>

                <div>
                  <p className="text-sm text-white/40">Price Paid</p>
                  <p className="text-white font-semibold">
                    ${formatCurrency(Number(userRobot.purchased_price || robot.price))}
                  </p>
                </div>

                {/* Deriv Access Key */}
                {isDerivRobot && deriv_access_key && (
                  <div>
                    <p className="text-sm text-amber-400 mb-2 flex items-center gap-1">
                      <span>🔑</span> Deriv Access Key
                    </p>
                    <div className="flex items-center gap-3 bg-black/60 p-3 rounded-xl font-mono text-sm break-all border border-amber-500/30">
                      <span className="flex-1">{deriv_access_key}</span>
                      <button
                        onClick={() => copyToClipboard(userRobot.id, deriv_access_key)}
                        className="text-amber-400 hover:text-white transition-colors p-1.5 rounded-lg"
                      >
                        {copiedId === userRobot.id ? (
                          <Check size={18} />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ========== ELITE CONFIG PANEL ========== */}
                {isElite && (
                  <EliteConfigPanel
                    robotId={robot.id}
                    robotName={robot.name}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
