"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Asset {
  id: number
  name: string
  asset_type: string
  current_price?: string
}

interface WatchlistProps {
  assets: Asset[]
  onSelectAsset: (asset: Asset) => void
  selectedAssetId?: number
}

export function Watchlist({ assets, onSelectAsset, selectedAssetId }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<number[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Load watchlist from localStorage
    const saved = localStorage.getItem("watchlist")
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved))
      } catch (error) {
        console.error("[v0] Failed to load watchlist:", error)
      }
    }
  }, [])

  const saveWatchlist = (newWatchlist: number[]) => {
    setWatchlist(newWatchlist)
    localStorage.setItem("watchlist", JSON.stringify(newWatchlist))
  }

  const addToWatchlist = (assetId: number) => {
    if (!watchlist.includes(assetId)) {
      const newWatchlist = [...watchlist, assetId]
      saveWatchlist(newWatchlist)
      toast({
        title: "Added to watchlist",
        description: "Asset has been added to your watchlist",
      })
    }
  }

  const removeFromWatchlist = (assetId: number) => {
    const newWatchlist = watchlist.filter((id) => id !== assetId)
    saveWatchlist(newWatchlist)
    toast({
      title: "Removed from watchlist",
      description: "Asset has been removed from your watchlist",
    })
  }

  const watchedAssets = assets.filter((asset) => watchlist.includes(asset.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {watchedAssets.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground">
              Click the star icon next to any asset to add it to your watchlist
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchedAssets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAssetId === asset.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
                onClick={() => onSelectAsset(asset)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{asset.asset_type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromWatchlist(asset.id)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function WatchlistToggle({ assetId, className }: { assetId: number; className?: string }) {
  const [watchlist, setWatchlist] = useState<number[]>([])
  const [isInWatchlist, setIsInWatchlist] = useState(false)

  useEffect(() => {
    // Load watchlist from localStorage
    const saved = localStorage.getItem("watchlist")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWatchlist(parsed)
        setIsInWatchlist(parsed.includes(assetId))
      } catch (error) {
        console.error("[v0] Failed to load watchlist:", error)
      }
    }
  }, [assetId])

  const toggleWatchlist = () => {
    let newWatchlist: number[]
    if (isInWatchlist) {
      newWatchlist = watchlist.filter((id) => id !== assetId)
    } else {
      newWatchlist = [...watchlist, assetId]
    }
    setWatchlist(newWatchlist)
    setIsInWatchlist(!isInWatchlist)
    localStorage.setItem("watchlist", JSON.stringify(newWatchlist))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        toggleWatchlist()
      }}
    >
      <Star className={`w-4 h-4 ${isInWatchlist ? "fill-primary text-primary" : "text-muted-foreground"}`} />
    </Button>
  )
}