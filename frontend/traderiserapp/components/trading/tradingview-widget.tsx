
"use client"

import { useEffect, useRef } from "react"

interface TradingViewWidgetProps {
  symbol?: string
}

export function TradingViewWidget({ symbol = "EURUSD" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    // Clear previous widget
    container.current.innerHTML = ""

    // Create script element for TradingView widget
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "www.tradingview.com",
    })

    container.current.appendChild(script)
  }, [symbol])

  return (
    <div className="rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/10 w-full">
      <div ref={container} className="w-full" style={{ height: "500px" }} />
    </div>
  )
}