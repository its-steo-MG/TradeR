// hooks/use-forex-data.ts
import useSWR from "swr";
import { api } from "@/lib/api";
import { useMemo } from "react";

// ==================== INTERFACES ====================

export interface ForexPair {
  id: number;
  name: string;
  base_simulation_price?: number;
  quote_currency?: string
  base_currency?: string
}

export interface Position {
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
  entry_time?: string;
  time_frame: string;
  account: number | { balance: number };
}

// Interface for what your backend actually returns
export interface ForexTrade {
  id: number;
  pair?: string;           // may be missing or different name
  direction?: "buy" | "sell";
  volume_lots?: number;
  entry_price?: number;
  exit_price?: number;
  profit_loss?: number;
  closed_at?: string;
  // Add any other fields your real API returns
}

// Clean interface you want to use in components
export interface TradeHistoryItem {
  id: number;
  pair: string;
  direction: "buy" | "sell";
  volume_lots: number;
  entry_price: number;
  exit_price?: number;
  profit_loss?: number;
  closed_at?: string;
}

// ==================== HOOKS ====================

export function useForexPairs() {
  const { data, error, mutate } = useSWR<ForexPair[]>(
    "/forex/pairs/",
    () =>
      api.getForexPairs().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data?.pairs || [];
      }),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 10000,
    }
  );

  return {
    pairs: data || [],
    isLoading: !data && !error,
    error: error?.message,
    mutate,
  };
}

export function useCurrentPrice(pairId: number) {
  const { data, error } = useSWR<number | null>(
    pairId ? `/forex/current-price/${pairId}/` : null,
    () =>
      api.getForexCurrentPrice(pairId).then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data?.current_price ?? null;
      }),
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  return {
    price: data,
    isLoading: !data && !error,
    error: error?.message,
  };
}

export function useCurrentPrices(pairIds: number[]) {
  const key = pairIds.length > 0 ? `/forex/current-prices/?ids=${pairIds.join(",")}` : null;

  const { data, error, isLoading } = useSWR<Record<number, number>>(
    key,
    () =>
      api.getForexCurrentPrices(pairIds).then((res) => {
        if (res.error) throw new Error(res.error);
        return (res.data as { prices?: Record<number, number> })?.prices || {};
      }),
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  const prices = useMemo(() => {
    if (!data) return {} as Record<number, number>;
    return pairIds.reduce((acc, id) => {
      acc[id] = data[id] ?? 0;
      return acc;
    }, {} as Record<number, number>);
  }, [data, pairIds]);

  return {
    prices,
    isLoading: isLoading || !data,
    error: error?.message,
  };
}

export function usePositions() {
  const { data, error, mutate } = useSWR<Position[]>(
    "/forex/positions/",
    () =>
      api.getForexPositions().then((res) => {
        if (res.error) throw new Error(res.error);
        return res.data?.positions || [];
      }),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      refreshInterval: 8000,
    }
  );

  return {
    positions: data || [],
    isLoading: !data && !error,
    error: error?.message,
    mutate,
  };
}

export function useTradeHistory() {
  const fetcher = async (): Promise<TradeHistoryItem[]> => {
    const res = await api.getForexHistory();
    if (res.error) throw new Error(res.error);

    const rawTrades = res.data?.trades ?? res.data ?? [];

    if (!Array.isArray(rawTrades)) {
      console.warn("Unexpected trade history response format:", res.data);
      return [];
    }

    // Safe conversion from ForexTrade[] to TradeHistoryItem[]
    return rawTrades.map((trade: any): TradeHistoryItem => ({
      id: trade.id,
      pair: trade.pair || trade.symbol || "Unknown",           // adjust field name if needed
      direction: trade.direction || "buy",
      volume_lots: trade.volume_lots ?? trade.volume ?? 0,
      entry_price: trade.entry_price ?? trade.entry ?? 0,
      exit_price: trade.exit_price ?? trade.exit_price,
      profit_loss: trade.profit_loss ?? trade.profit_loss,
      closed_at: trade.closed_at ?? trade.closed_at,
    }));
  };

  const { data, error, isLoading } = useSWR<TradeHistoryItem[]>(
    "/forex/history/",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      refreshInterval: 15000,
    }
  );

  return {
    trades: data || [],
    isLoading: isLoading || !data,
    error: error?.message,
  };
}