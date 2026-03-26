'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDerivStore } from '@/lib/store'

const API_BASE = '/api/deriv'

export function useAuth() {
  const { auth, setAuth, logout, addNotification } = useDerivStore()
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load saved auth from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = sessionStorage.getItem('deriv_auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setAuth(data)
      } catch (e) {
        console.error('Failed to parse stored auth:', e)
        sessionStorage.removeItem('deriv_auth')
      }
    }
    setMounted(true)
  }, [setAuth])

  // ==================== CONNECT TO DERIV ACCOUNT ====================
  const loginWithDeriv = useCallback(async () => {
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/oauth/login/`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`)
      }

      const data = await res.json()

      if (data.success && data.auth_url) {
        console.log('✅ Redirecting to Deriv Login:', data.auth_url)
        window.location.href = data.auth_url
      } else {
        throw new Error(data.message || 'No auth_url received from backend')
      }
    } catch (err: any) {
      console.error('LoginWithDeriv Error:', err)
      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: err.message || 'Could not connect to Deriv. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [addNotification])

  // ==================== HANDLE CALLBACK FROM DERIV-CALLBACK PAGE ====================
  const handleDerivCallbackSuccess = useCallback((expires_at?: string) => {
    const authData = {
      isLoggedIn: true,
      token: '', // Token is managed server-side via Django session
      expires_at: expires_at || new Date(Date.now() + 3600 * 1000).toISOString(),
    }

    setAuth(authData)
    sessionStorage.setItem('deriv_auth', JSON.stringify(authData))

    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Deriv account connected successfully!',
    })

    console.log('✅ Deriv account connected via redirect flow')
  }, [setAuth, addNotification])

  const handleDerivCallbackError = useCallback((message: string) => {
    addNotification({
      type: 'error',
      title: 'Connection Failed',
      message: message || 'Failed to connect Deriv account. Please try again.',
    })
  }, [addNotification])

  // Auto-detect success from redirect flow (runs when user lands on any page after callback)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const expiresAt = params.get('expires_at')

    if (success === 'true' && !auth.isLoggedIn) {
      handleDerivCallbackSuccess(expiresAt || undefined)

      // Clean the URL (remove query params)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [auth.isLoggedIn, handleDerivCallbackSuccess])

  // Logout handler
  const handleLogout = useCallback(() => {
    logout()
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('deriv_auth')
    
    addNotification({
      type: 'success',
      message: 'Logged out successfully',
    })
  }, [logout, addNotification])

  return {
    auth,
    isLoading,
    loginWithDeriv,
    logout: handleLogout,
    isAuthenticated: auth.isLoggedIn && mounted,
    // Helpers for deriv-callback page
    handleDerivCallbackSuccess,
    handleDerivCallbackError,
  }
}