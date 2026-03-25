'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LiquidGlassCard } from './liquid-glass-card'
import { GlassButton } from './glass-button'
import { useDerivAPI } from '@/hooks/use-deriv'
import { formatCurrency, formatTime, getProfitLossBgColor } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import type { OpenContract } from '@/lib/types'

interface OpenPositionsProps {
  contracts: OpenContract[]
  onContractClosed?: (contractId: string) => void
}

export function OpenPositions({ contracts, onContractClosed }: OpenPositionsProps) {
  const { closeContract } = useDerivAPI()
  const [closingId, setClosingId] = React.useState<string | null>(null)

  const handleCloseContract = async (contractId: string) => {
    setClosingId(contractId)
    const result = await closeContract(contractId)
    if (result && onContractClosed) {
      onContractClosed(contractId)
    }
    setClosingId(null)
  }

  if (contracts.length === 0) {
    return (
      <LiquidGlassCard className="text-center py-8">
        <p className="text-muted-foreground">No open positions</p>
      </LiquidGlassCard>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground px-1">Open Positions ({contracts.length})</h3>

      <AnimatePresence>
        {contracts.map((contract, index) => {
          const profit = (contract.payout || 0) - (contract.profit || 0)
          const isWon = contract.status === 'won'

          return (
            <motion.div
              key={contract.contractId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <LiquidGlassCard
                className={`space-y-3 ${getProfitLossBgColor(profit)}`}
                hoverEffect
              >
                {/* Contract Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{contract.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {contract.contractType} • ID: {contract.contractId.slice(0, 8)}...
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      isWon
                        ? 'bg-success/20 text-success border border-success/30'
                        : contract.status === 'lost'
                          ? 'bg-error/20 text-error border border-error/30'
                          : 'bg-muted/20 text-muted-foreground border border-muted/30'
                    }`}
                  >
                    {contract.status.toUpperCase()}
                  </span>
                </div>

                {/* Entry & Expiry Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-semibold text-foreground">{contract.entrySpot.toFixed(5)}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {formatTime(contract.entryTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="font-semibold text-foreground">
                      {contract.expiryTime > Math.floor(Date.now() / 1000)
                        ? formatTime(contract.expiryTime)
                        : 'Expired'}
                    </p>
                  </div>
                </div>

                {/* Profit Display */}
                {profit !== 0 && (
                  <div className="border-t border-current/10 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Profit/Loss</span>
                      <span
                        className={`text-lg font-bold ${
                          profit > 0
                            ? 'text-success'
                            : profit < 0
                              ? 'text-error'
                              : 'text-foreground'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                {contract.status === 'open' && (
                  <GlassButton
                    onClick={() => handleCloseContract(contract.contractId)}
                    isLoading={closingId === contract.contractId}
                    size="sm"
                    variant="danger"
                    fullWidth
                  >
                    <Trash2 className="w-4 h-4" />
                    Close Position
                  </GlassButton>
                )}
              </LiquidGlassCard>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
