// components/fx-pro-trading/market-dropdown.tsx
"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useForexPairs } from "@/hooks/use-forex-data"
import { toast } from "sonner"
import { mutate } from "swr"

interface MarketDropdownProps {
  selectedMarket: number | null
  onSelectMarket: (pairId: number) => void
}

export default function MarketDropdown({ selectedMarket, onSelectMarket }: MarketDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { pairs, isLoading, error } = useForexPairs()
  const selected = pairs.find((p) => p.id === selectedMarket)

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load markets: ${error.message || "Unknown error"}`)
      console.error("Market dropdown error:", error)
    }
  }, [error])

  useEffect(() => {
    const handleSessionUpdate = () => {
      console.log("Refreshing pairs due to session update")
      mutate("/forex/pairs/", undefined, { revalidate: true })
    }
    window.addEventListener("session-updated", handleSessionUpdate)
    return () => window.removeEventListener("session-updated", handleSessionUpdate)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Periodic pair refresh")
      mutate("/forex/pairs/", undefined, { revalidate: true })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-black border border-border text-foreground hover:bg-black/80"
        disabled={isLoading}
      >
        <div className="text-left">
          <p className="font-semibold">{selected?.name || "Select Market"}</p>
          <p className="text-xs text-muted-foreground">
            {selected ? `${selected.base_currency}/${selected.quote_currency}` : "Select a pair"}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 bg-black border-border z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading markets...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              Error loading markets: {error.message || "Unknown error"}
              <button
                onClick={() => mutate("/forex/pairs/", undefined, { revalidate: true })}
                className="ml-2 text-blue-500 underline"
              >
                Retry
              </button>
            </div>
          ) : pairs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No markets available</div>
          ) : (
            pairs.map((pair: { id: number; name: string; base_currency: string; quote_currency: string; base_simulation_price: number | string }) => (
              <button
                key={pair.id}
                onClick={() => {
                  onSelectMarket(pair.id)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                  selectedMarket === pair.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{pair.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pair.base_currency}/{pair.quote_currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-foreground">
                      {Number(pair.base_simulation_price).toFixed(4)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </Card>
      )}
    </div>
  )
}