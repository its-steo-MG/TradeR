'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { useDerivStore } from '@/lib/store'
import type { Proposal, BuyResponse, OpenContract } from '@/lib/types'
import { API_ENDPOINTS } from '@/lib/constants'

// Helper to get JWT token
function getJwtToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token')
  }
  return null
}

// Common headers with Authorization
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getJwtToken() || ''}`,
})

export function useDerivAPI() {
  const {
    setError,
    addNotification,
    setAccountInfo,
    setCurrentProposal,
    addOpenContract,
    updateOpenContract,
  } = useDerivStore()

  const [isProposalLoading, setIsProposalLoading] = useState(false)
  const [isBuyLoading, setIsBuyLoading] = useState(false)

  // ====================== FETCH PROPOSAL ======================
  const fetchProposal = useCallback(
    async (symbol: string, contractType: string, stake: number, duration: number, durationUnit: string) => {
      try {
        setIsProposalLoading(true)
        setError(null)

        const response = await fetch(API_ENDPOINTS.PROPOSAL, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            symbol,
            contract_type: contractType,
            amount: stake,
            duration,
            duration_unit: durationUnit,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to fetch proposal')
        }

        const data = (await response.json()) as Proposal
        setCurrentProposal(data)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch proposal'
        setError(message)
        addNotification({ type: 'error', message, title: 'Proposal Error' })
        return null
      } finally {
        setIsProposalLoading(false)
      }
    },
    [setError, addNotification, setCurrentProposal],
  )

  // ====================== BUY CONTRACT ======================
  const buyContract = useCallback(
    async (contractParams: any) => {
      try {
        setIsBuyLoading(true)
        setError(null)

        const response = await fetch(API_ENDPOINTS.BUY, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(contractParams),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to buy contract')
        }

        const data = (await response.json()) as BuyResponse

        if (data.success && data.contract_id) {
          const contract: OpenContract = {
            contractId: data.contract_id,
            symbol: contractParams.symbol,
            contractType: contractParams.contract_type,
            entrySpot: contractParams.amount,
            entryTime: Math.floor(Date.now() / 1000),
            expiryTime: data.expiry_time || 0,
            spotEntry: contractParams.amount,
            status: 'open',
          }

          addOpenContract(contract)
          addNotification({
            type: 'success',
            message: `Contract bought successfully`,
            title: 'Trade Executed',
          })
          setCurrentProposal(null)
          return data
        }

        throw new Error('Failed to execute trade')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to buy contract'
        setError(message)
        addNotification({ type: 'error', message, title: 'Trade Error' })
        return null
      } finally {
        setIsBuyLoading(false)
      }
    },
    [setError, addNotification, addOpenContract, setCurrentProposal],
  )

  // ====================== BALANCE ======================
  const fetchBalance = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch(API_ENDPOINTS.ACCOUNT_BALANCE, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch balance')
      }

      const data = await response.json()

      if (data.success) {
        setAccountInfo({
          balance: data.balance?.balance || data.balance || 0,
          currency: data.balance?.currency || 'USD',
          email: data.email || '',
        })
        return data
      }

      throw new Error('Invalid balance response')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch balance'
      setError(message)
      return null
    }
  }, [setError, setAccountInfo])

  // ====================== OPEN CONTRACTS & CLOSE ======================
  const fetchOpenContracts = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(API_ENDPOINTS.OPEN_CONTRACTS, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch open contracts')

      const data = await response.json()
      return data.success ? (data.contract || data) : data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch open contracts'
      setError(message)
      return null
    }
  }, [setError])

  const closeContract = useCallback(
    async (contractId: string) => {
      try {
        setError(null)

        const response = await fetch(API_ENDPOINTS.CLOSE_CONTRACT, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ contract_id: contractId }),
        })

        if (!response.ok) throw new Error('Failed to close contract')

        const data = await response.json()

        if (data.success) {
          updateOpenContract(contractId, { status: 'closed' })
          addNotification({
            type: 'success',
            message: 'Contract closed successfully',
            title: 'Contract Closed',
          })
          return data
        }
        throw new Error('Failed to close contract')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to close contract'
        setError(message)
        addNotification({ type: 'error', message, title: 'Close Error' })
        return null
      }
    },
    [setError, addNotification, updateOpenContract],
  )

  return {
    fetchProposal,
    isProposalLoading,
    buyContract,
    isBuyLoading,
    fetchBalance,
    fetchOpenContracts,
    closeContract,
  }
}

// ====================== WEBSOCKET ======================
export function useDerivWebSocket(onMessage?: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [data, setData] = useState<any>(null)
  const { setTick } = useDerivStore()

  const token = getJwtToken()
  //const wsUrl = token ? `wss://traderiserproapp.onrender.com/wss/deriv/ticks/?token=${token}` : null
  const wsUrl = token ? `wss://localhost:8001/wss/deriv/ticks/?token=${token}` : null

  useEffect(() => {
    if (!wsUrl) {
      console.warn('[v0] No JWT token found. WebSocket connection skipped.')
      return
    }

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        console.log('[v0] ✅ Deriv Ticks WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          setData(parsed)

          if (parsed.type === 'tick' && parsed.symbol) {
            setTick({
              symbol: parsed.symbol,
              bid: parsed.tick?.bid ?? parsed.tick?.quote ?? 0,
              ask: parsed.tick?.ask ?? 0,
              timestamp: parsed.tick?.epoch ?? Math.floor(Date.now() / 1000),
              isClosed: false,
            })
          }

          onMessage?.(parsed)
        } catch (err) {
          console.error('[v0] Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('[v0] WebSocket error:', error)
        setIsConnected(false)
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        console.log(`[v0] WebSocket closed (code: ${event.code})`)
      }

      return () => wsRef.current?.close()
    } catch (error) {
      console.error('[v0] Failed to initialize WebSocket:', error)
    }
  }, [wsUrl, onMessage, setTick])

  const send = useCallback((message: { action: 'subscribe' | 'unsubscribe'; symbol: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[v0] WebSocket is not connected')
    }
  }, [])

  return { isConnected, data, send }
}