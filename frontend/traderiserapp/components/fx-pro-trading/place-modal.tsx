// components/fx-pro-trading/place-modal.tsx
"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { api } from "@/lib/api"
import { mutate } from "swr"

interface Props {
  pairId: number
  direction: "buy" | "sell"
  timeFrame: string
  onClose: () => void
  onPlaceOrder: () => void
}

export default function PlaceOrderModal({ pairId, direction: initDir, timeFrame, onClose, onPlaceOrder }: Props) {
  const [direction, setDirection] = useState<"buy" | "sell">(initDir)
  const [volume, setVolume] = useState("0.1")
  const [sl, setSl] = useState("")
  const [tp, setTp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await api.placeForexOrder({
        pair_id: pairId,
        direction,
        volume_lots: parseFloat(volume),
        sl: sl ? parseFloat(sl) : undefined,
        tp: tp ? parseFloat(tp) : undefined,
      })
      onPlaceOrder()
      mutate("/forex/positions/")
      mutate("/wallet/wallets/")
    } catch (err: unknown) {
      setError((err as { message: string }).message || "Failed to place order. Insufficient balance or invalid parameters.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Place Order</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "buy" | "sell")}
              className="w-full px-3 py-2 bg-muted border border-border rounded"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Volume (Lots)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stop Loss (optional)</label>
            <input
              type="number"
              step="0.0001"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="e.g. 1.0800"
              className="w-full px-3 py-2 bg-muted border border-border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Take Profit (optional)</label>
            <input
              type="number"
              step="0.0001"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="e.g. 1.1000"
              className="w-full px-3 py-2 bg-muted border border-border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time Frame</label>
            <input
              type="text"
              value={timeFrame === "M1" ? "1 Minute" : timeFrame === "M5" ? "5 Minutes" : timeFrame === "M15" ? "15 Minutes" : timeFrame === "H1" ? "1 Hour" : timeFrame === "H4" ? "4 Hours" : "24 Hours"}
              readOnly
              className="w-full px-3 py-2 bg-muted border border-border rounded text-muted-foreground"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-muted rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
            >
              {loading ? "Placing..." : "Place Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}