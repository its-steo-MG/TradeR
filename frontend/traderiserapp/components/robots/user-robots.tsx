"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/format-currency"
import { Copy, Check, Settings, MoreVertical, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { EliteConfigPanel } from "./elite-config-panel"

interface Robot {
  id: number
  name: string
  description: string
  price: string
  image?: string
  is_deriv_robot?: boolean
  is_elite_robot?: boolean
  effective_price?: string
}

interface UserRobot {
  id: number
  robot: Robot
  purchased_at: string | null
  purchased_price?: string
  deriv_access_key?: string
  is_used?: boolean
  is_setting?: boolean
}

export function UserRobots() {
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [showConfigFor, setShowConfigFor] = useState<number | null>(null)
  const [upgradingId, setUpgradingId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const copyToClipboard = (id: number, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    toast.success("Access key copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleUpgradeToElite = async (userRobot: UserRobot) => {
    const fullPrice = Number(userRobot.robot.price)

    const confirmed = window.confirm(
      `Upgrade to Elite?\n\nThis will charge the full price of $${formatCurrency(
        fullPrice
      )} and unlock the Settings button so you can configure the Elite robot again.`
    )
    if (!confirmed) return

    setUpgradingId(userRobot.id)
    try {
      const accountType = localStorage.getItem("account_type") || "standard"
      const res = await api.upgradeElite(accountType)

      if (res?.error) throw new Error(res.error)

      // Unlock settings
      setUserRobots((prev) =>
        prev.map((ur) =>
          ur.id === userRobot.id ? { ...ur, is_used: false } : ur
        )
      )

      toast.success("Upgrade successful! Settings unlocked.", {
        description: `Charged $${formatCurrency(fullPrice)}`,
      })
    } catch (err: any) {
      toast.error(err.message || "Upgrade failed")
    } finally {
      setUpgradingId(null)
    }
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
        const {
          robot,
          purchased_at,
          deriv_access_key,
          is_used = false,
          is_setting = false,
        } = userRobot

        const purchaseDate = purchased_at
          ? new Date(purchased_at).toLocaleDateString()
          : "Unknown"

        const isDerivRobot = robot.is_deriv_robot || !!deriv_access_key
        const isEliteRobot = !!robot.is_elite_robot

        // Once configured (is_setting = true) → permanently Elite
        const isPermanentlyElite = !!is_setting

        // Show as Elite if permanently configured OR not yet used
        const showAsElite = isEliteRobot && (isPermanentlyElite || !is_used)

        // Settings only before first configuration
        const showSettings = isEliteRobot && !is_used && !isPermanentlyElite

        // Upgrade button only when used AND not yet permanently configured
        const showUpgradeTag = isEliteRobot && is_used && !isPermanentlyElite

        // Config panel when user opens it or already configured
        const showConfigPanel =
          isEliteRobot && (showConfigFor === userRobot.id || isPermanentlyElite)

        return (
          <div
            key={userRobot.id}
            className={`relative rounded-3xl p-6 flex flex-col overflow-hidden ${
              showAsElite ? "ring-2 ring-amber-500/50" : ""
            }`}
            style={{
              background: showAsElite
                ? "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(255,255,255,0.06) 100%)"
                : "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: showAsElite
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">{robot.name}</h3>

                    {/* ★ ELITE badge */}
                    {showAsElite && (
                      <span className="text-xs bg-amber-500/25 text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                        ★ ELITE
                      </span>
                    )}

                    {isDerivRobot && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                        DERIV PREMIUM
                      </span>
                    )}

                    {isPermanentlyElite && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2.5 py-0.5 rounded-full font-medium">
                        Configured
                      </span>
                    )}
                  </div>

                  {/* Settings / 3-dots – only before first configuration */}
                  {showSettings && (
                    <div
                      className="relative"
                      ref={openMenuId === userRobot.id ? menuRef : null}
                    >
                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === userRobot.id ? null : userRobot.id
                          )
                        }
                        className="p-1.5 rounded-lg text-white/60 hover:text-amber-300 hover:bg-white/10 transition-colors"
                        title="Settings"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuId === userRobot.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-zinc-900 border border-white/15 shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => {
                              setShowConfigFor(userRobot.id)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-white hover:bg-amber-500/20 transition-colors"
                          >
                            <Settings size={15} className="text-amber-400" />
                            Configure to Elite
                          </button>
                        </div>
                      )}
                    </div>
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
                    $
                    {formatCurrency(
                      Number(userRobot.purchased_price || robot.price)
                    )}
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
                        onClick={() =>
                          copyToClipboard(userRobot.id, deriv_access_key)
                        }
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

                {/* Upgrade to Elite – only when used AND not yet permanent */}
                {showUpgradeTag && (
                  <button
                    onClick={() => handleUpgradeToElite(userRobot)}
                    disabled={upgradingId === userRobot.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/40 text-amber-300 text-sm font-semibold hover:from-amber-500/30 hover:to-orange-600/30 transition-all disabled:opacity-60"
                  >
                    {upgradingId === userRobot.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>⬆ Upgrade to Elite</>
                    )}
                  </button>
                )}

                {/* Elite Config Panel */}
                {showConfigPanel && showAsElite && (
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