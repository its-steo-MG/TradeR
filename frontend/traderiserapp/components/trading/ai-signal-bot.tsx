"use client"

import { useEffect, useState } from "react"
import { api, type Signal, type UserRobot, type ForexRobot } from "@/lib/api"
import { toast } from "sonner"
import SignalPurchaseCard from "./signal-purchase-card"
import SignalScannerAnimation from "./signal-scanner-animation"
import SignalResultCard from "./signal-result-card"

export default function AISignalBot() {
  const [isActivated, setIsActivated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [aiBotId, setAiBotId] = useState<number | null>(null)

  const scanPhrases = [
    "Initializing global market scan...",
    "Fetching overall forex data...",
    "Analyzing crypto markets worldwide...",
    "Processing RSI & ATR across all pairs...",
    "Evaluating strongest signals from all markets...",
  ]

  const [currentPhrase, setCurrentPhrase] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available robots to find AI Signal Bot
        const robotsResponse = await api.getRobots()

        if (robotsResponse.data && Array.isArray(robotsResponse.data)) {
          const aiBot = (robotsResponse.data as ForexRobot[]).find((robot) => {
            const name = robot.name.toLowerCase()
            return (
              (name.includes("ai") && (name.includes("signal") || name.includes("siganal") || name.includes("siganl"))) ||
              name === "ai signal bot" ||
              name === "ai siganal bot" ||
              name === "ai siganl bot"
            )
          })

          if (aiBot) {
            setAiBotId(aiBot.id)
            console.log("Found AI Signal Bot:", aiBot.name, "ID:", aiBot.id)
          } else {
            console.warn("AI Signal Bot not found in robots list")
            toast.error("AI Signal Bot not available. Contact support.")
          }
        }

        // Fetch user's owned robots
        const userRobotsResponse = await api.getUserRobots()

        let userRobots: UserRobot[] = []

        if (userRobotsResponse.data) {
          const data = userRobotsResponse.data

          // Case 1: data is directly the array
          if (Array.isArray(data)) {
            userRobots = data as UserRobot[]
          }
          // Case 2: data is an object with a user_robots array property
          else if (typeof data === "object" && data !== null && "user_robots" in data) {
            const possibleArray = (data as Record<string, unknown>).user_robots
            if (Array.isArray(possibleArray)) {
              userRobots = possibleArray as UserRobot[]
            }
          }
          // Other shapes → stay empty
        }

        // Check if user owns the AI Signal Bot
        const hasSignalBot = userRobots.some((item: UserRobot) => {
          const name = item.robot.name.toLowerCase()
          return (
            name.includes("ai") &&
            (name.includes("signal") || name.includes("siganal") || name.includes("siganl"))
          )
        })

        setIsActivated(hasSignalBot)
        if (hasSignalBot) {
          console.log("AI Signal Bot is activated for this user")
        }
      } catch (error) {
        console.error("Failed to load AI Signal Bot data:", error)
        toast.error("Failed to connect to server")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Cycle through scanning phrases
  useEffect(() => {
    if (!isScanning) return

    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % scanPhrases.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [isScanning])

  const handleScanSignal = async () => {
    if (!isActivated) return

    setIsScanning(true)
    setSignal(null)
    setCurrentPhrase(0)

    try {
      // Visual delay for dramatic effect
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const response = await api.generateSignal()
      console.log("Generate Signal Response:", response)

      if (response.error) {
        toast.error(response.error || "Failed to generate signal")
        return
      }

      // Handle "no strong signal" message
      if (response.data && typeof response.data === "object" && "message" in response.data) {
        toast.info((response.data as { message: string }).message || "No strong signal found. Try again later.")
        return
      }

      if (response.data) {
        setSignal(response.data as Signal)
        toast.success("Strong AI signal detected!")
      } else {
        toast.info("No signal found in current market conditions.")
      }
    } catch (error) {
      toast.error("Scan failed. Please check your connection.")
      console.error(error)
    } finally {
      setIsScanning(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading AI Signal Bot...</p>
      </div>
    )
  }

  // Not purchased → show purchase card
  if (!isActivated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
        <SignalPurchaseCard
          onPurchaseSuccess={() => {
            setIsActivated(true)
            toast.success("AI Signal Bot activated!")
          }}
          aiBotId={aiBotId}
        />
      </div>
    )
  }

  // Scanning in progress
  if (isScanning) {
    return (
      <div className="relative min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
        <SignalScannerAnimation />
        <div className="relative z-10 text-center space-y-6">
          <h2 className="text-4xl font-bold text-green-400 animate-pulse">
            {scanPhrases[currentPhrase]}
          </h2>
          <p className="text-green-300 text-lg">Hacking into global markets with AI analysis...</p>
        </div>
      </div>
    )
  }

  // Signal result
  if (signal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 p-4 md:p-8">
        <SignalResultCard signal={signal} onScanAgain={handleScanSignal} />
      </div>
    )
  }

  // Default: Ready to scan
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 p-8">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold text-white">AI Signal Bot</h1>
          <p className="text-xl text-gray-400">
            Scans overall markets using real-time API data for accurate signals
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleScanSignal}
            disabled={isScanning}
            className="relative inline-block group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-green-400 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition duration-300" />
            <div className="relative px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-bold text-white text-lg hover:from-green-600 hover:to-green-700 transition-all">
              Scan Overall Markets
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="font-bold text-white mb-2">Global Coverage</h3>
            <p className="text-gray-400 text-sm">
              Analyzes all major forex and crypto markets simultaneously.
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="font-bold text-white mb-2">Advanced AI Scan</h3>
            <p className="text-gray-400 text-sm">
              Uses real-time API for RSI, ATR on hourly data across overall markets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}