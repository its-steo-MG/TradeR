// components/fx-pro-trading/trades-page.tsx
"use client"

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WalletDisplay from "@/components/wallet-display";
import { usePositions, type Position } from "@/hooks/use-forex-data";
import { usePriceUpdates } from "@/hooks/use-price-updates";
import { api } from "@/lib/api";
import { mutate } from "swr";
import { toast } from "sonner";

export default function TradesPage() {
  const { positions, isLoading, error, mutate: mutatePositions } = usePositions();
  const { prices, isSashi } = usePriceUpdates();

  const [closingId, setClosingId] = useState<number | null>(null);
  const [closingAll, setClosingAll] = useState(false);
  const [animatedPL, setAnimatedPL] = useState<Record<number, number>>({});

  const animationFrameRef = useRef<number | null>(null);
  const warnedMarginCall = useRef<Set<number>>(new Set());

  const calculateFloatingPL = (position: Position, currentPrice: number): number => {
    const pipValue = 0.0001;
    const pipDelta = position.direction === 'buy'
      ? (currentPrice - position.entry_price) / pipValue
      : (position.entry_price - currentPrice) / pipValue;

    const profit = pipDelta * position.volume_lots * position.pair.contract_size * pipValue -
                   (position.pair.spread * position.volume_lots * position.pair.contract_size * pipValue);

    return isNaN(profit) ? 0 : profit;
  };

  // Total floating P&L
  const totalFloatingPL = positions.reduce((sum, position) => {
    const currentPrice = prices[position.pair.id] ?? position.entry_price;
    const pl = calculateFloatingPL(position, currentPrice);
    return sum + pl;
  }, 0);

  // Live P&L Animation
  useEffect(() => {
    const animate = () => {
      const newAnimatedPL: Record<number, number> = {};
      let hasChanges = false;

      positions.forEach((position) => {
        const currentPrice = prices[position.pair.id] ?? position.entry_price;
        const targetPL = calculateFloatingPL(position, currentPrice);
        const currentAnimated = animatedPL[position.id] ?? targetPL;

        if (Math.abs(targetPL - currentAnimated) > 0.01) {
          const lerped = currentAnimated + (targetPL - currentAnimated) * 0.22;
          newAnimatedPL[position.id] = lerped;
          hasChanges = true;
        } else {
          newAnimatedPL[position.id] = targetPL;
        }
      });

      if (hasChanges || Object.keys(newAnimatedPL).length !== Object.keys(animatedPL).length) {
        setAnimatedPL(newAnimatedPL);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [positions, prices]);

  // Margin call warning
  useEffect(() => {
    positions.forEach((position) => {
      const currentPrice = prices[position.pair.id] ?? position.entry_price;
      const newPL = calculateFloatingPL(position, currentPrice);

      const accountBalance = typeof position.account === 'number'
        ? position.account
        : (position.account as { balance: number })?.balance ?? 0;

      if (!isSashi && newPL <= 0 && Math.abs(newPL) >= accountBalance * 0.95) {
        if (!warnedMarginCall.current.has(position.id)) {
          toast.warning(`Margin Call Risk: ${position.pair.name}`);
          warnedMarginCall.current.add(position.id);
        }
      } else {
        warnedMarginCall.current.delete(position.id);
      }
    });
  }, [positions, prices, isSashi]);

  const handleClosePosition = async (positionId: number) => {
    try {
      setClosingId(positionId);
      await api.closeForexPosition(positionId);
      await mutatePositions();
      mutate("/wallet/wallets/");
      toast.success("Position closed successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to close position");
    } finally {
      setClosingId(null);
    }
  };

  const handleCloseAllPositions = async () => {
    try {
      setClosingAll(true);
      await api.closeAllPositions();
      await mutatePositions();
      mutate("/wallet/wallets/");
      toast.success("All positions closed successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to close all positions");
    } finally {
      setClosingAll(false);
    }
  };

  // NEW: Force refresh positions every 3 seconds when EA might be running
  useEffect(() => {
    const interval = setInterval(() => {
      mutatePositions();
    }, 3000);

    return () => clearInterval(interval);
  }, [mutatePositions]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Open Trades</h1>
        <WalletDisplay />
      </div>

      {/* Summary Card */}
      <Card className="p-4 bg-card/50 border-border">
        <div className="flex justify-between items-center mb-2">
          <p className="text-muted-foreground">Open Trades</p>
          <p className="text-xl font-bold">{positions.length}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Floating P&L</p>
          <p className={`text-2xl font-bold ${totalFloatingPL >= 0 ? "text-green-500" : "text-red-500"}`}>
            ${totalFloatingPL.toFixed(2)}
          </p>
        </div>
      </Card>

      {/* Trades List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p>Loading open trades...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center text-red-500">
            <p>{error}</p>
            <button 
              onClick={() => mutatePositions()} 
              className="underline mt-2 text-blue-500 hover:text-blue-600"
            >
              Retry
            </button>
          </Card>
        ) : positions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No open trades at the moment</p>
          </Card>
        ) : (
          <>
            <Button
              onClick={handleCloseAllPositions}
              disabled={closingAll || positions.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800"
            >
              {closingAll 
                ? "Closing All Positions..." 
                : `Close All Positions (${positions.length})`
              }
            </Button>

            {positions.map((position) => {
              const currentPrice = prices[position.pair.id] ?? position.entry_price;
              const pl = animatedPL[position.id] ?? calculateFloatingPL(position, currentPrice);
              const color = pl >= 0 ? "text-green-500" : "text-red-500";

              return (
                <Card 
                  key={position.id} 
                  className="p-4 bg-card/50 border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">{position.pair.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {position.direction.toUpperCase()} • {position.volume_lots} lots • {position.time_frame}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {Number(position.entry_price).toFixed(5)} → {Number(currentPrice).toFixed(5)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className={`font-bold text-xl tabular-nums ${color}`}>
                        ${pl.toFixed(2)}
                      </p>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleClosePosition(position.id)}
                        disabled={closingId === position.id}
                        className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}