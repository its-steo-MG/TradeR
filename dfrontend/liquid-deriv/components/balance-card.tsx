'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LiquidGlassCard } from './liquid-glass-card'
import { formatCurrency, formatLargeNumber } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

interface BalanceCardProps {
  balance?: number
  currency?: string
  email?: string
  isLoading?: boolean
  onRefresh?: () => void
}

export function BalanceCard({
  balance = 0,
  currency = 'USD',
  email,
  isLoading = false,
  onRefresh,
}: BalanceCardProps) {
  const [showBalance, setShowBalance] = React.useState(true)

  return (
    <LiquidGlassCard glowEffect>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Account Balance
            </p>
            {email && <p className="text-xs text-muted-foreground mt-1">{email}</p>}
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 hover:bg-muted/20 rounded transition-colors"
            aria-label="Toggle balance visibility"
          >
            {showBalance ? (
              <Eye className="w-4 h-4 text-muted-foreground" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Balance Display */}
        <motion.div
          animate={{ opacity: showBalance ? 1 : 0.3 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-1">
            <p className="text-4xl font-bold text-primary">
              {showBalance ? formatLargeNumber(balance) : '•••'}
            </p>
            <p className="text-sm text-muted-foreground">{currency}</p>
          </div>
        </motion.div>

        {/* Status */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-primary rounded-full animate-pulse" />
            Updating...
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border pt-3"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Balance'}
          </button>
        )}
      </div>
    </LiquidGlassCard>
  )
}
