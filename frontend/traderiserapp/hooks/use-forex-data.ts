// hooks/use-forex-data.ts
import useSWR from "swr"
import { api } from "@/lib/api"
import { useMemo } from "react"

export function useForexPairs() {
  const { data, error, mutate } = useSWR("/forex/pairs/", () =>
    api.getForexPairs().then((res) => {
      if (res.error) throw new Error(res.error)
      console.log("Fetched pairs:", res.data?.pairs)
      return res.data?.pairs || []
    }),
    { revalidateOnFocus: true, revalidateOnReconnect: true, revalidateIfStale: true }
  )
  return {
    pairs: data || [],
    isLoading: !data && !error,
    error: error?.message,
    mutate,
  }
}

export function useCurrentPrice(pairId: number) {
  const { data, error } = useSWR(pairId ? `/forex/current-price/${pairId}/` : null, () =>
    api.getForexCurrentPrice(pairId).then((res) => {
      if (res.error) throw new Error(res.error)
      console.log(`Fetched price for pair ${pairId}:`, res.data?.current_price)
      return res.data?.current_price
    }),
    { refreshInterval: 5000, revalidateOnFocus: true, revalidateIfStale: true }
  )
  return {
    price: data,
    isLoading: !data && !error,
    error: error?.message,
  }
}

export function useCurrentPrices(pairIds: number[]) {
  const { data, error, isLoading } = useSWR(
    pairIds.length > 0 ? `/forex/current-prices/?ids=${pairIds.join(",")}` : null,
    () =>
      api.getForexCurrentPrices(pairIds).then((res) => {
        if (res.error) throw new Error(res.error)
        console.log("Fetched prices:", res.data)
        return (res.data as { prices?: Record<number, number> })?.prices || {}
      }),
    { refreshInterval: 5000, revalidateOnFocus: true, revalidateIfStale: true }
  )

  const prices = useMemo(() => {
    if (!data) return {}
    return pairIds.reduce((acc, id) => {
      acc[id] = data[id]
      return acc
    }, {} as Record<number, number | undefined>)
  }, [data, pairIds])

  return {
    prices,
    isLoading: isLoading || !data,
    error: error?.message,
  }
}

export function usePositions() {
  const { data, error, mutate } = useSWR("/forex/positions/", () =>
    api.getForexPositions().then((res) => {
      if (res.error) throw new Error(res.error)
      return res.data?.positions || []
    }),
    { revalidateOnFocus: true, revalidateIfStale: true }
  )
  return {
    positions: data || [],
    isLoading: !data && !error,
    error: error?.message,
    mutate,
  }
}

export function useTradeHistory() {
  const { data, error } = useSWR("/forex/history/", () =>
    api.getForexHistory().then((res) => {
      if (res.error) throw new Error(res.error)
      return res.data?.trades || []
    }),
    { revalidateOnFocus: true, revalidateIfStale: true }
  )
  return {
    trades: data || [],
    isLoading: !data && !error,
    error: error?.message,
  }
}