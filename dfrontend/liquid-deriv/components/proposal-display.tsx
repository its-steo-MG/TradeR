'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LiquidGlassCard } from './liquid-glass-card'
import { GlassButton } from './glass-button'
import { useDerivAPI } from '@/hooks/use-deriv'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { Proposal } from '@/lib/types'

interface ProposalDisplayProps {
  proposal: Proposal | null
  onClose?: () => void
}

export function ProposalDisplay({ proposal, onClose }: ProposalDisplayProps) {
  const { buyContract, isBuyLoading } = useDerivAPI()

  if (!proposal) {
    return (
      <LiquidGlassCard className="text-center py-8">
        <p className="text-muted-foreground">Request a quote to see the proposal</p>
      </LiquidGlassCard>
    )
  }

  const handleBuy = async () => {
    if (!proposal) return

    try {
      // ✅ Fixed: Now passing a single object (most common pattern with your proxy)
      const result = await buyContract({
        proposal_id: proposal.id,     // or 'proposalId' depending on your hook
        price: proposal.askPrice,     // This is the correct way
      })

      if (result?.success && onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Buy contract failed:', error)
    }
  }

  const profitPotential = proposal.payout - proposal.premium
  const roi = proposal.premium > 0 
    ? ((profitPotential / proposal.premium) * 100).toFixed(2) 
    : '0.00'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LiquidGlassCard glowEffect className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Contract Proposal
            </h3>
            <p className="text-sm text-muted-foreground">
              Expires at {formatTime(proposal.expiryTime, true)}
            </p>
          </div>
          {proposal.status === 'expired' && (
            <span className="px-2 py-1 rounded text-xs bg-error/20 text-error border border-error/30">
              Expired
            </span>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="text-lg font-semibold text-foreground">
              {proposal.spotEntry.toFixed(5)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ask Price</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(proposal.askPrice)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Max Payout</p>
            <p className="text-lg font-semibold text-success">
              {formatCurrency(proposal.payout)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Premium</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(proposal.premium)}
            </p>
          </div>
        </div>

        {/* Profit Calculation */}
        <div className="bg-success/10 border border-success/30 rounded-lg p-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Profit Potential</span>
            <span className="text-sm font-semibold text-success">
              {formatCurrency(profitPotential)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Return on Investment</span>
            <span className="text-sm font-semibold text-success">{roi}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <GlassButton
            onClick={handleBuy}
            isLoading={isBuyLoading}
            disabled={proposal.status === 'expired' || isBuyLoading}
            variant="primary"
            fullWidth
            glowEffect
          >
            Buy for {formatCurrency(proposal.askPrice)}
          </GlassButton>

          {onClose && (
            <GlassButton 
              onClick={onClose} 
              variant="secondary" 
              size="md"
            >
              Clear
            </GlassButton>
          )}
        </div>
      </LiquidGlassCard>
    </motion.div>
  )
}