// hooks/use-price-updates.ts
import { useEffect, useState, useRef } from 'react';
import { useForexPairs, usePositions } from './use-forex-data';
import { api } from '@/lib/api';
import { toast } from 'sonner';

class PriceSimulator {
  private basePrice: number;
  private volatility: number;
  private entryTime: Date | null = null;
  private isSashi: boolean;
  private direction: string;
  private timeFrame: string;

  constructor(
    basePrice: number,
    isSashi: boolean,
    direction: string = 'buy',
    volatility: number = 0.0005,
    timeFrame: string = 'M1'
  ) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.isSashi = isSashi;
    this.direction = direction;
    this.timeFrame = timeFrame;
  }

  setEntryTime(entryTime: string) {
    this.entryTime = new Date(entryTime);
  }

  getCurrentPrice(): number {
    if (!this.entryTime) {
      const change = (Math.random() * 2 - 1) * this.volatility * this.getTimeFrameMultiplier();
      return Math.max(this.basePrice + change, 0.0001);
    }

    const timeElapsed = (Date.now() - this.entryTime.getTime()) / 1000 / 60;
    const multiplier = this.getTimeFrameMultiplier();

    if (this.isSashi) {
      if (timeElapsed >= 30 * multiplier) {
        return Math.max(this.basePrice + (this.direction === 'buy' ? 0.0020 : -0.0020), 0.0001);
      }
      if (Math.random() < 0.1) {
        return Math.max(this.basePrice - 0.0005 * multiplier, 0.0001);
      }
    } else {
      if (timeElapsed >= (10 + Math.random() * 10) * multiplier) {
        return Math.max(this.basePrice - (this.direction === 'buy' ? 0.0020 : -0.0020), 0.0001);
      }
    }

    const change = (Math.random() * 2 - 1) * this.volatility * multiplier;
    return Math.max(this.basePrice + change, 0.0001);
  }

  private getTimeFrameMultiplier(): number {
    const multipliers: Record<string, number> = { M1: 1, M5: 5, M15: 15, H1: 60, H4: 240, D1: 1440 };
    return multipliers[this.timeFrame] ?? 1;
  }
}

export const usePriceUpdates = () => {
  const { pairs, isLoading: pairsLoading, error: pairsError } = useForexPairs();
  const { positions, isLoading: positionsLoading, error: positionsError } = usePositions();

  const [prices, setPrices] = useState<Record<number, number>>({});
  const [isSashi, setIsSashi] = useState<boolean>(false);

  const simulatorsRef = useRef<Record<number, PriceSimulator>>({});
  const pairIdsRef = useRef<number[]>([]);

  // Fetch Sashi status once
  useEffect(() => {
    const fetchSashiStatus = async () => {
      try {
        const response = await api.getAccount();
        if (response.status === 403 && response.error === 'Pro-FX account required') {
          toast.error('Pro-FX account required to trade');
          return;
        }
        setIsSashi(!!(response.data as any)?.user?.is_sashi);
      } catch (error) {
        console.error('Error fetching Sashi status:', error);
      }
    };
    fetchSashiStatus();
  }, []);

  // Initialize / update simulators when pairs or positions change
  useEffect(() => {
    if (pairsLoading || positionsLoading) return;

    const relevantPairIds = [
      ...new Set([
        ...positions.map((pos) => pos.pair.id),
        ...pairs.map((p) => p.id),
      ]),
    ];

    pairIdsRef.current = relevantPairIds;

    const newSimulators: Record<number, PriceSimulator> = { ...simulatorsRef.current };

    relevantPairIds.forEach((pairId) => {
      const pair = pairs.find((p) => p.id === pairId);
      const position = positions.find((pos) => pos.pair.id === pairId);

      const basePrice = Number(pair?.base_simulation_price) || 1.1000;

      // Create or update simulator if base price changed
      if (!newSimulators[pairId] || (newSimulators[pairId] as any).basePrice !== basePrice) {
        newSimulators[pairId] = new PriceSimulator(
          basePrice,
          isSashi,
          position ? position.direction : 'buy',
          0.0005,
          position ? position.time_frame : 'M1'
        );
      }

      if (position?.entry_time) {
        newSimulators[pairId].setEntryTime(position.entry_time);
      }
    });

    simulatorsRef.current = newSimulators;

    // FIXED: Set initial prices (basePrice is now properly scoped)
    const initialPrices: Record<number, number> = {};
    relevantPairIds.forEach((pairId) => {
      const pair = pairs.find((p) => p.id === pairId);
      const basePrice = Number(pair?.base_simulation_price) || 1.1000;

      initialPrices[pairId] = 
        newSimulators[pairId]?.getCurrentPrice() ?? basePrice;
    });

    setPrices(initialPrices);
  }, [pairs, positions, pairsLoading, positionsLoading, isSashi]);

  // Continuous price simulation loop (runs every 1s)
  useEffect(() => {
    if (Object.keys(simulatorsRef.current).length === 0) return;

    const updatePrices = () => {
      const newPrices: Record<number, number> = {};
      Object.keys(simulatorsRef.current).forEach((pairIdStr) => {
        const pairId = Number(pairIdStr);
        newPrices[pairId] = simulatorsRef.current[pairId].getCurrentPrice();
      });
      setPrices(newPrices);
    };

    const interval = setInterval(updatePrices, 1000);
    updatePrices(); // immediate first update

    return () => clearInterval(interval);
  }, []);

  // Periodic sync with backend (every 30s)
  useEffect(() => {
    if (pairIdsRef.current.length === 0) return;

    const syncWithBackend = async () => {
      try {
        const response = await api.getForexCurrentPrices(pairIdsRef.current);
        if (response.status === 403 && response.error === 'Pro-FX account required') {
          toast.error('Pro-FX account required to fetch prices');
          return;
        }

        const data = response.data as any;
        if (data?.prices) {
          setPrices((prev) => ({ ...prev, ...data.prices }));

          // Update simulators with real backend prices
          const updatedSimulators: Record<number, PriceSimulator> = { ...simulatorsRef.current };

          Object.keys(data.prices).forEach((pairIdStr) => {
            const pairId = Number(pairIdStr);
            const position = positions.find((pos) => pos.pair.id === pairId);

            updatedSimulators[pairId] = new PriceSimulator(
              data.prices[pairId],
              isSashi,
              position ? position.direction : 'buy',
              0.0005,
              position ? position.time_frame : 'M1'
            );

            if (position?.entry_time) {
              updatedSimulators[pairId].setEntryTime(position.entry_time);
            }
          });

          simulatorsRef.current = updatedSimulators;
        }
      } catch (error) {
        console.error('Error syncing prices with server:', error);
      }
    };

    syncWithBackend();
    const syncInterval = setInterval(syncWithBackend, 30000);
    return () => clearInterval(syncInterval);
  }, [positions, isSashi]);

  // Error handling
  useEffect(() => {
    if (pairsError) toast.error(`Failed to load pairs: ${pairsError}`);
    if (positionsError) toast.error(`Failed to load positions: ${positionsError}`);
  }, [pairsError, positionsError]);

  return { 
    prices, 
    pairIds: pairIdsRef.current, 
    isLoading: pairsLoading || positionsLoading, 
    isSashi 
  };
};