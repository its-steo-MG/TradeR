"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/format-currency"

interface Robot {
  id: number
  name: string
  description: string
  price: string
  image?: string
}

interface UserRobot {
  robot: Robot
  purchased_at: string | null
}

export function UserRobots() {
  const [userRobots, setUserRobots] = useState<UserRobot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserRobots = async () => {
      try {
        const { data, error } = await api.getUserRobots()
        if (error) throw new Error(error)

        const ownedRobots = (data as UserRobot[]).filter((ur) => ur.purchased_at !== null)
        setUserRobots(ownedRobots)
      } catch (err) {
        console.error("Failed to load user robots:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRobots()
  }, [])

  if (isLoading) {
    return <p className="text-white/60">Loading your robots...</p>
  }

  if (userRobots.length === 0) {
    return (
      <div className="rounded-2xl p-12 bg-white/10 backdrop-blur-md border border-white/20 text-center">
        <p className="text-white/60 mb-4">You have not purchased any robots yet</p>
        <p className="text-sm text-white/40">Head to the Marketplace tab to start trading with our robots</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userRobots.map((userRobot) => {
        const { robot, purchased_at } = userRobot
        const purchaseDate = purchased_at ? new Date(purchased_at).toLocaleDateString() : "Unknown"

        return (
          <div
            key={robot.id}
            className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 flex flex-col"
          >
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
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-sm text-white/40 mb-2">Purchased</p>
              <p className="text-lg font-semibold text-white">{purchaseDate}</p>
              <p className="text-sm text-white/60 mt-3">Price: ${formatCurrency(Number(robot.price))}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
