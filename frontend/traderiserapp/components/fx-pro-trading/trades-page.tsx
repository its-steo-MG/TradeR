// components/fx-pro-trading/trades-page.tsx
"use client"

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WalletDisplay from "@/components/wallet-display";
import { usePositions } from "@/hooks/use-forex-data";
import { usePriceUpdates } from "@/hooks/use-price-updates";
import { api } from "@/lib/api";
import { mutate } from "swr";
import { toast } from "sonner";

interface Position {
  id: number;
  pair: {
    id: number;
    name: string;
    contract_size: number;
    spread: number;
  };
  direction: "buy" | "sell";
  volume_lots: number;
  entry_price: number;
  time_frame: string;
  account: number | { balance: number };
}

export default function TradesPage() {
  const { positions, isLoading, error, mutate: mutatePositions } = usePositions();
  const { prices, isSashi } = usePriceUpdates();
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closingAll, setClosingAll] = useState(false);
  const [animatedPL, setAnimatedPL] = useState<{ [key: number]: number }>({});
  const warnedMarginCall = useRef<Set<number>>(new Set());

  const calculateFloatingPL = (position: Position, currentPrice: number) => {
    const pipValue = 0.0001;
    const pipDelta = position.direction === 'buy'
      ? (currentPrice - position.entry_price) / pipValue
      : (position.entry_price - currentPrice) / pipValue;
    const profit = pipDelta * position.volume_lots * position.pair.contract_size * pipValue -
                   (position.pair.spread * position.volume_lots * position.pair.contract_size * pipValue);
    return profit;
  };

  const totalFloatingPL = positions.reduce((sum, position) => {
    const currentPrice = prices[position.pair.id] || position.entry_price;
    const pl = calculateFloatingPL(position, currentPrice);
    return sum + (isNaN(pl) ? 0 : pl);
  }, 0);

  // Smooth animation using requestAnimationFrame
  useEffect(() => {
    const frameIds: number[] = [];
    const targetPL = new Map<number, number>();
    const currentPL = new Map<number, number>();

    positions.forEach((position) => {
      const currentPrice = prices[position.pair.id] || position.entry_price;
      const newPL = calculateFloatingPL(position, currentPrice);
      targetPL.set(position.id, newPL);
      currentPL.set(position.id, animatedPL[position.id] ?? newPL);
    });

    const animate = () => {
      let hasChanges = false;
      const updated: [number, number][] = [];

      positions.forEach((position) => {
        const start = currentPL.get(position.id)!;
        const end = targetPL.get(position.id)!;
        const diff = end - start;

        if (Math.abs(diff) > 0.01) {
          const next = start + diff * 0.12; // Smooth easing
          currentPL.set(position.id, next);
          updated.push([position.id, next]);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setAnimatedPL(Object.fromEntries(updated));
        frameIds.push(requestAnimationFrame(animate));
      }
    };

    frameIds.push(requestAnimationFrame(animate));

    return () => frameIds.forEach(cancelAnimationFrame);
  }, [positions, prices, isSashi]); // No animatedPL in deps

  // Margin call warning (once per position)
  useEffect(() => {
    positions.forEach((position) => {
      const currentPrice = prices[position.pair.id] || position.entry_price;
      const newPL = calculateFloatingPL(position, currentPrice);
      const accountBalance = typeof position.account === 'number'
        ? position.account
        : (position.account as { balance: number }).balance ?? 0;

      if (!isSashi && newPL <= 0 && Math.abs(newPL) >= accountBalance) {
        if (!warnedMarginCall.current.has(position.id)) {
          toast.warning(`Margin Call: ${position.pair.name}`);
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
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error("Position not found");

      const currentPrice = prices[position.pair.id] || position.entry_price;
      const realizedPL = calculateFloatingPL(position, currentPrice);

      await api.closeForexPosition(positionId);
      mutatePositions();
      mutate("/wallet/wallets/");
      toast.success(`Position closed with P&L $${realizedPL.toFixed(2)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    } finally {
      setClosingId(null);
    }
  };

  const handleCloseAllPositions = async () => {
    try {
      setClosingAll(true);
      await api.closeAllPositions();
      mutatePositions();
      mutate("/wallet/wallets/");
      toast.success("All positions closed!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to close all");
    } finally {
      setClosingAll(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Open Trades</h1>
        <WalletDisplay />
      </div>

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

      <div className="space-y-2">
        {isLoading ? (
          <Card className="p-8 text-center"><p>Loading...</p></Card>
        ) : error ? (
          <Card className="p-8 text-center text-red-500">
            <p>{error}</p>
            <button onClick={() => mutatePositions()} className="underline mt-2">Retry</button>
          </Card>
        ) : positions.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No open trades</p></Card>
        ) : (
          <>
            <Button
              onClick={handleCloseAllPositions}
              disabled={closingAll}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {closingAll ? "Closing All..." : "Close All Positions"}
            </Button>

            {positions.map((position) => {
              const currentPrice = prices[position.pair.id] || position.entry_price;
              const pl = animatedPL[position.id] ?? calculateFloatingPL(position, currentPrice);
              const color = pl >= 0 ? "text-green-500" : "text-red-500";

              return (
                <Card key={position.id} className="p-3 bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{position.pair.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {position.direction.toUpperCase()} • {position.volume_lots} lots • {position.time_frame}
                      </p>
                      <p className="text-xs font-mono mt-1">
                        {Number(position.entry_price).toFixed(3)} → {Number(currentPrice).toFixed(3)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold text-lg ${color}`}>
                        ${pl.toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleClosePosition(position.id)}
                        disabled={closingId === position.id}
                        className="hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
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