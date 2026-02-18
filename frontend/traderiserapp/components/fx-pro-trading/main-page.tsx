// app/(protected)/fx-pro-trading/page.tsx   (or wherever MainPage lives)
"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import WalletDisplay from "@/components/wallet-display"
import { TradingViewChart } from "@/components/fx-pro-trading/trading-view-chart"
import PlaceOrderModal from "@/components/fx-pro-trading/place-modal"
import MarketDropdown from "@/components/market-dropdown"   // <-- NEW
import { useForexPairs } from "@/hooks/use-forex-data"                // <-- NEW
import { mutate } from "swr"
import { toast } from "sonner"

export default function MainPage() {
  /* ------------------------------------------------------------------ */
  /* 1. Pair selection – now comes from the backend                     */
  /* ------------------------------------------------------------------ */
  const { pairs, isLoading: pairsLoading, error: pairsError } = useForexPairs()
  const [pairId, setPairId] = useState<number | null>(null)

  // Auto-select the first pair once data arrives
  useEffect(() => {
    if (!pairsLoading && pairs.length > 0 && pairId === null) {
      setPairId(pairs[0].id)
    }
  }, [pairs, pairsLoading, pairId])

  // Show errors (optional – you already have toast handling inside MarketDropdown)
  useEffect(() => {
    if (pairsError) {
      toast.error(`Failed to load markets: ${pairsError}`)
    }
  }, [pairsError])

  /* ------------------------------------------------------------------ */
  /* 2. Modal & order handling                                           */
  /* ------------------------------------------------------------------ */
  const [modalOpen, setModalOpen] = useState(false)
  const [direction, setDirection] = useState<"buy" | "sell">("buy")
  const [timeFrame, setTimeFrame] = useState<string>("M1")   // default to 1-minute

  const openModal = (dir: "buy" | "sell") => {
    setDirection(dir)
    setModalOpen(true)
  }

  /* ------------------------------------------------------------------ */
  /* 3. Debug (optional)                                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    console.log("Selected pairId:", pairId, "Time Frame:", timeFrame)
  }, [pairId, timeFrame])

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* -------------------------------------------------------------- */}
      {/* Header */}
      {/* -------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pro FX Trading</h1>
        <WalletDisplay />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Market selector – REAL pairs from backend */}
      {/* -------------------------------------------------------------- */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Select Market
        </label>

        {/* MarketDropdown handles loading / error / empty states */}
        <MarketDropdown
          selectedMarket={pairId}
          onSelectMarket={setPairId}
        />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Chart */}
      {/* -------------------------------------------------------------- */}
      {pairId && (
        <Card className="p-3">
          <TradingViewChart pairId={pairId} timeFrame={timeFrame} />
        </Card>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Time-frame selector */}
      {/* -------------------------------------------------------------- */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Time Frame
        </label>
        <select
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded"
        >
          {[
            { value: "M1", label: "1 Minute" },
            { value: "M5", label: "5 Minutes" },
            { value: "M15", label: "15 Minutes" },
            { value: "H1", label: "1 Hour" },
            { value: "H4", label: "4 Hours" },
            { value: "D1", label: "24 Hours" },
          ].map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Buy / Sell buttons */}
      {/* -------------------------------------------------------------- */}
      {pairId && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => openModal("buy")}
            disabled={!pairId}
            className="h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Buy
          </Button>
          <Button
            onClick={() => openModal("sell")}
            disabled={!pairId}
            className="h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Sell
          </Button>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Place-order modal */}
      {/* -------------------------------------------------------------- */}
      {modalOpen && pairId && (
        <PlaceOrderModal
          pairId={pairId}
          direction={direction}
          timeFrame={timeFrame}
          onClose={() => setModalOpen(false)}
          onPlaceOrder={() => {
            setModalOpen(false)
            mutate("/forex/positions/")
            mutate("/wallet/wallets/")
            toast.success("Order placed successfully")
          }}
        />
      )}
    </div>
  )
}