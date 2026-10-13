// components/trading/ai-signal-bot.tsx
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
        const robotsResponse = await api.getRobots()

        if (robotsResponse.data && Array.isArray(robotsResponse.data)) {
          const aiBot = (robotsResponse.data as ForexRobot[]).find((robot) => {
            const name = robot.name.toLowerCase()
            return (
              (name.includes("ai") &&
                (name.includes("signal") ||
                  name.includes("siganal") ||
                  name.includes("siganl"))) ||
              name === "ai signal bot" ||
              name === "ai siganal bot" ||
              name === "ai siganl bot"
            )
          })

          if (aiBot) {
            setAiBotId(aiBot.id)
          } else {
            toast.error("AI Signal Bot not available. Contact support.")
          }
        }

        const userRobotsResponse = await api.getUserRobots()
        let userRobots: UserRobot[] = []

        if (userRobotsResponse.data) {
          const data = userRobotsResponse.data
          if (Array.isArray(data)) {
            userRobots = data as UserRobot[]
          } else if (typeof data === "object" && data !== null && "user_robots" in data) {
            const possibleArray = (data as Record<string, unknown>).user_robots
            if (Array.isArray(possibleArray)) {
              userRobots = possibleArray as UserRobot[]
            }
          }
        }

        const hasSignalBot = userRobots.some((item: UserRobot) => {
          const name = item.robot.name.toLowerCase()
          return (
            name.includes("ai") &&
            (name.includes("signal") || name.includes("siganal") || name.includes("siganl"))
          )
        })

        setIsActivated(hasSignalBot)
      } catch (error) {
        console.error("Failed to load AI Signal Bot data:", error)
        toast.error("Failed to connect to server")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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
      await new Promise((resolve) => setTimeout(resolve, 5000))
      const response = await api.generateSignal()

      if (response.error) {
        toast.error(response.error || "Failed to generate signal")
        return
      }

      if (response.data && typeof response.data === "object" && "message" in response.data) {
        toast.info(
          (response.data as { message: string }).message ||
            "No strong signal found. Try again later.",
        )
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

  // Shared background
  const Background = () => (
    <>
      <div className="fixed inset-0 z-0 dark:block hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>
      <div className="fixed inset-0 z-0 block dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-400/8 rounded-full blur-3xl" />
      </div>
    </>
  )

  if (isLoading) {
    return (
      <div className="relative min-h-screen text-foreground overflow-hidden">
        <Background />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <p className="text-foreground text-xl">Loading AI Signal Bot...</p>
        </div>
      </div>
    )
  }

  if (!isActivated) {
    return (
      <div className="relative min-h-screen text-foreground overflow-hidden">
        <Background />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <SignalPurchaseCard
            onPurchaseSuccess={() => {
              setIsActivated(true)
              toast.success("AI Signal Bot activated!")
            }}
            aiBotId={aiBotId}
          />
        </div>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <Background />
        <SignalScannerAnimation />
        <div className="relative z-10 text-center space-y-6">
          <h2 className="text-4xl font-bold text-green-600 dark:text-green-400 animate-pulse">
            {scanPhrases[currentPhrase]}
          </h2>
          <p className="text-green-700 dark:text-green-300 text-lg">
            Hacking into global markets with AI analysis...
          </p>
        </div>
      </div>
    )
  }

  if (signal) {
    return (
      <div className="relative min-h-screen text-foreground overflow-hidden p-4 md:p-8">
        <Background />
        <div className="relative z-10">
          <SignalResultCard signal={signal} onScanAgain={handleScanSignal} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden p-8">
      <Background />

      <div className="relative z-10 w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold text-foreground">AI Signal Bot</h1>
          <p className="text-xl text-slate-500 dark:text-zinc-400">
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="font-bold text-foreground mb-2">Global Coverage</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              Analyzes all major forex and crypto markets simultaneously.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="font-bold text-foreground mb-2">Advanced AI Scan</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              Uses real-time API for RSI, ATR on hourly data across overall markets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}