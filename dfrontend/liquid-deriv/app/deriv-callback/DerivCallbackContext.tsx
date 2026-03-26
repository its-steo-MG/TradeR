'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function DerivCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const { 
    handleDerivCallbackSuccess, 
    handleDerivCallbackError 
  } = useAuth()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing your Deriv connection...')

  useEffect(() => {
    const success = searchParams.get('success')
    const msg = searchParams.get('message') || ''
    const expiresAt = searchParams.get('expires_at')

    if (success === 'true') {
      setStatus('success')
      setMessage(msg || 'Deriv account connected successfully!')

      handleDerivCallbackSuccess(expiresAt || undefined)

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1800)

    } else {
      setStatus('error')
      setMessage(msg || 'Failed to connect your Deriv account. Please try again.')

      handleDerivCallbackError(msg)

      // Redirect back to settings
      setTimeout(() => {
        router.push('/settings')
      }, 2500)
    }
  }, [searchParams, router, handleDerivCallbackSuccess, handleDerivCallbackError])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Connecting to Deriv
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we securely link your account...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl">✅</span>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">
              Success!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl">❌</span>
            </div>
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-3">
              Connection Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">{message}</p>
            
            <button
              onClick={() => router.push('/settings')}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all active:scale-95"
            >
              Try Again
            </button>
            
            <p className="text-xs text-gray-500 mt-6">
              You can also go back and try connecting again
            </p>
          </div>
        )}
      </div>
    </div>
  )
}