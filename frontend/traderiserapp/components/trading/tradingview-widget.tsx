"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface TradingViewWidgetProps {
  symbol?: string
}

export function TradingViewWidget({ symbol = "EURUSD" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!container.current) return

    container.current.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: resolvedTheme === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "www.tradingview.com",
    })

    container.current.appendChild(script)
  }, [symbol, resolvedTheme])

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full">
      <div ref={container} className="w-full" style={{ height: "500px" }} />
    </div>
  )
}