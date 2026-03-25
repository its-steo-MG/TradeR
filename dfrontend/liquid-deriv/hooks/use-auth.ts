'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDerivStore } from '@/lib/store'

const API_BASE = '/api/deriv'

export function useAuth() {
  const { auth, setAuth, logout, addNotification } = useDerivStore()
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load saved auth from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = sessionStorage.getItem('deriv_auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setAuth(data)
        if (data.token) {
          localStorage.setItem('access_token', data.token)
        }
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
        credentials: 'include',        // Important for Django session (PKCE)
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
        throw new Error(data.message || 'No auth_url received from server')
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

  // ==================== HANDLE OAUTH CALLBACK ====================
  const handleOAuthCallback = useCallback(async (code: string, state: string) => {
    try {
      setIsLoading(true)

      const res = await fetch(`${API_BASE}/oauth/callback/`, {
        method: 'POST',                    // Changed to POST (recommended)
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code, state }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Callback failed')
      }

      const data = await res.json()

      if (data.success) {
        const authData = {
          isLoggedIn: true,
          token: data.access_token || data.token,
          email: data.email || '',           // You can expand this later
        }

        setAuth(authData)
        localStorage.setItem('access_token', authData.token)
        sessionStorage.setItem('deriv_auth', JSON.stringify(authData))

        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Deriv account connected successfully!',
        })

        // Clean up URL (remove ?code=...&state=... from browser address bar)
        window.history.replaceState({}, '', window.location.pathname)
      } else {
        throw new Error(data.message || 'Authentication failed')
      }
    } catch (err: any) {
      console.error('Callback Error:', err)
      addNotification({
        type: 'error',
        title: 'Auth Error',
        message: err.message || 'Failed to complete authentication',
      })
    } finally {
      setIsLoading(false)
    }
  }, [setAuth, addNotification])

  // Auto handle callback when Deriv redirects back to your app
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    // Only run if we have code + state and user is not yet logged in
    if (code && state && !auth.isLoggedIn) {
      handleOAuthCallback(code, state)
    }
  }, [auth.isLoggedIn, handleOAuthCallback])

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
  }
}