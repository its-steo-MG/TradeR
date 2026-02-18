// components/fx-pro-trading/trading-view-chart.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useForexPairs } from "@/hooks/use-forex-data"
import { usePriceUpdates } from "@/hooks/use-price-updates"
import { toast } from "sonner"

interface Props {
  pairId: number
  timeFrame?: string
}

export function TradingViewChart({ pairId, timeFrame = "D" }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const { pairs, isLoading: pairsLoading, error: pairsError } = useForexPairs()
  const { prices } = usePriceUpdates()
  const pair = pairs.find((p: { id: number }) => p.id === pairId)
  const [widgetError, setWidgetError] = useState<string | null>(null)

  // Map your pair name → valid TradingView symbol
  const getTVSymbol = (name: string): string | null => {
    const map: Record<string, string> = {
       // Forex
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF",
  AUDUSD: "FX:AUDUSD",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  EURGBP: "FX:EURGBP",
  EURJPY: "FX:EURJPY",
  GBPJPY: "FX:GBPJPY",
  EURCHF: "FX:EURCHF",
  AUDJPY: "FX:AUDJPY",
  CADJPY: "FX:CADJPY",
  CHFJPY: "FX:CHFJPY",
  EURAUD: "FX:EURAUD",
  EURNZD: "FX:EURNZD",
  GBPAUD: "FX:GBPAUD",
  GBPNZD: "FX:GBPNZD",
  AUDCAD: "FX:AUDCAD",
  AUDCHF: "FX:AUDCHF",
  CADCHF: "FX:CADCHF",
  NZDCAD: "FX:NZDCAD",
  NZDCHF: "FX:NZDCHF",
  // Metals
  XAUUSD: "FX:XAUUSD",
  XAGUSD: "FX:XAGUSD",
  // Oil
  USOIL: "TVC:USOIL",
  UKOIL: "TVC:UKOIL",
  // Crypto
  BTCUSD: "BINANCE:BTCUSD",
  ETHUSD: "BINANCE:ETHUSD",
  BNBUSD: "BINANCE:BNBUSD",
  ADAUSD: "BINANCE:ADAUSD",
  SOLUSD: "BINANCE:SOLUSD",
  DOTUSD: "BINANCE:DOTUSD",
  LINKUSD: "BINANCE:LINKUSD",
  LTCUSD: "BINANCE:LTCUSD",
  XRPUSD: "BINANCE:XRPUSD",
}
    return map[name.toUpperCase()] || null
  }

  useEffect(() => {
    if (!container.current || !pair) return

    const tvSymbol = getTVSymbol(pair.name)
    setWidgetError(null)

    // Clear container
    container.current.innerHTML = ""

    if (!tvSymbol) {
      setWidgetError(`Chart not available for ${pair.name}`)
      return
    }

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.onerror = () => {
      setWidgetError("Failed to load TradingView")
    }

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: timeFrame === "D1" ? "D" : timeFrame === "H4" ? "240" : timeFrame === "H1" ? "60" : "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "www.tradingview.com",
    })

    console.log("Loading TV widget:", tvSymbol)
    container.current.appendChild(script)

    return () => {
      if (container.current) {
        container.current.innerHTML = ""
      }
    }
  }, [pair, pairId, timeFrame])

  useEffect(() => {
    if (pairsError) toast.error(`Failed to load pairs: ${pairsError}`)
    if (widgetError) toast.error(widgetError)
  }, [pairsError, widgetError])

  if (pairsLoading) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-card/50 border-border rounded-2xl">
        Loading pair...
      </div>
    )
  }

  if (!pair) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-card/50 border-border rounded-2xl">
        No pair selected
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/10 w-full">
      <div ref={container} className="w-full" style={{ height: "500px" }} />

      {/* Live Price */}
      {prices[pairId] !== undefined ? (
        <div className="absolute top-2 right-2 bg-card/90 px-3 py-1 rounded text-sm">
          Current: <strong>{Number(prices[pairId]).toFixed(pair.quote_currency === "JPY" ? 3 : 5)}</strong>
        </div>
      ) : (
        <div className="absolute top-2 right-2 bg-card/90 px-3 py-1 rounded text-sm">
          Loading price...
        </div>
      )}

      {/* Error Fallback */}
      {widgetError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-yellow-400 text-center px-4">
            {widgetError}
            <br />
            <span className="text-xs">Simulated data not available</span>
          </p>
        </div>
      )}
    </div>
  )
}