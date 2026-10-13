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
  is_upgraded?: boolean
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
      } catch {
        toast.error("Failed to load your robots")
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserRobots()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
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
    if (!window.confirm(`Upgrade to Elite?\n\nThis will charge $${formatCurrency(fullPrice)} and unlock Settings.`)) return
    setUpgradingId(userRobot.id)
    try {
      const accountType = localStorage.getItem("account_type") || "standard"
      const res = await api.upgradeElite(accountType)
      if (res?.error) throw new Error(res.error)
      setUserRobots((prev) => prev.map((ur) => (ur.id === userRobot.id ? { ...ur, is_used: false, is_upgraded: true } : ur)))
      toast.success("Upgrade successful! Settings unlocked.")
    } catch (err: any) {
      toast.error(err.message || "Upgrade failed")
    } finally {
      setUpgradingId(null)
    }
  }

  if (isLoading) return <p className="text-slate-500 dark:text-zinc-400">Loading your robots...</p>

  if (userRobots.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-slate-500 dark:text-zinc-400 mb-4">You have not purchased any robots yet</p>
        <p className="text-sm text-slate-400 dark:text-zinc-500">Head to the Marketplace tab to start trading with our robots</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userRobots.map((userRobot) => {
        const { robot, purchased_at, deriv_access_key, is_used = false, is_setting = false, is_upgraded = false } = userRobot
        const purchaseDate = purchased_at ? new Date(purchased_at).toLocaleDateString() : "Unknown"
        const isDerivRobot = robot.is_deriv_robot || !!deriv_access_key
        const isEliteRobot = !!robot.is_elite_robot
        const isPermanentlyElite = !!is_setting
        const showAsElite = isEliteRobot && (isPermanentlyElite || !is_used)
        const showSettings = isEliteRobot && !is_used && !isPermanentlyElite
        const showUpgradeTag = isEliteRobot && is_used && !isPermanentlyElite
        const showConfigPanel = isEliteRobot && (showConfigFor === userRobot.id || isPermanentlyElite)

        return (
          <div key={userRobot.id} className={`relative rounded-3xl p-6 flex flex-col overflow-hidden border bg-white text-slate-900 dark:bg-zinc-950 dark:text-white ${showAsElite ? "border-amber-400 dark:border-amber-600" : "border-slate-200 dark:border-zinc-800"}`}>
            {robot.image && <img src={robot.image} alt={robot.name} className="w-full h-40 object-cover rounded-2xl mb-4" />}
            {is_upgraded && (
              <div className="absolute top-4 right-4 z-10">
                <span className="drop-on-top relative inline-flex items-center overflow-hidden rounded-full border border-cyan-300/70 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-cyan-500/40">
                  <span className="relative z-[1]">Upgraded</span>
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{robot.name}</h3>
                  {showAsElite && <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">ELITE</span>}
                  {isDerivRobot && <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">DERIV PREMIUM</span>}
                  {isPermanentlyElite && <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">Configured</span>}
                </div>
                {showSettings && (
                  <div className="relative" ref={openMenuId === userRobot.id ? menuRef : null}>
                    <button onClick={() => setOpenMenuId(openMenuId === userRobot.id ? null : userRobot.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-300">
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === userRobot.id && (
                      <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl z-20 overflow-hidden">
                        <button onClick={() => { setShowConfigFor(userRobot.id); setOpenMenuId(null) }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-amber-50 dark:hover:bg-amber-950">
                          <Settings size={15} className="text-amber-600 dark:text-amber-400" /> Configure to Elite
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{robot.description}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-zinc-400">Purchased</p>
                <p className="font-medium">{purchaseDate}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-zinc-400">Price Paid</p>
                <p className="font-semibold">${formatCurrency(Number(userRobot.purchased_price || robot.price))}</p>
              </div>
              {isDerivRobot && deriv_access_key && (
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Deriv Access Key</p>
                  <div className="flex items-center gap-3 bg-slate-100 dark:bg-zinc-900 p-3 rounded-xl font-mono text-sm break-all border border-amber-200 dark:border-amber-800">
                    <span className="flex-1">{deriv_access_key}</span>
                    <button onClick={() => copyToClipboard(userRobot.id, deriv_access_key)} className="text-amber-600 dark:text-amber-400">
                      {copiedId === userRobot.id ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}
              {showUpgradeTag && (
                <button onClick={() => handleUpgradeToElite(userRobot)} disabled={upgradingId === userRobot.id} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm font-semibold disabled:opacity-60">
                  {upgradingId === userRobot.id ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : "Upgrade to Elite"}
                </button>
              )}
              {showConfigPanel && showAsElite && <EliteConfigPanel robotId={robot.id} robotName={robot.name} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
