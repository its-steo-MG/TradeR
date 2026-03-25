'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LiquidGlassCard } from './liquid-glass-card'
import { formatPrice, getPriceMovementColor } from '@/lib/utils'
import type { Tick } from '@/lib/types'

interface TickDisplayProps {
  tick: Tick | undefined
  symbol: string
  precision?: number
}

export function TickDisplay({ tick, symbol, precision = 5 }: TickDisplayProps) {
  const [prevPrice, setPrevPrice] = useState<number | null>(null)
  const [priceColor, setPriceColor] = useState('text-foreground')

  useEffect(() => {
    if (tick && prevPrice !== null && tick.bid !== prevPrice) {
      setPriceColor(tick.bid > prevPrice ? 'text-success' : 'text-error')
      const timeout = setTimeout(() => setPriceColor('text-foreground'), 1000)
      return () => clearTimeout(timeout)
    }
    if (tick) {
      setPrevPrice(tick.bid)
    }
  }, [tick, prevPrice])

  if (!tick) {
    return (
      <LiquidGlassCard className="min-h-24 flex items-center justify-center">
        <p className="text-muted-foreground">Loading {symbol}...</p>
      </LiquidGlassCard>
    )
  }

  return (
    <LiquidGlassCard glowEffect hoverEffect={false}>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{symbol}</h3>

        <motion.div
          className={`text-3xl font-bold transition-colors duration-300 ${priceColor}`}
          animate={{ scale: priceColor !== 'text-foreground' ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {formatPrice(tick.bid, precision)}
        </motion.div>

        <div className="flex justify-between gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Bid</p>
            <p className="font-semibold text-foreground">{formatPrice(tick.bid, precision)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ask</p>
            <p className="font-semibold text-foreground">{formatPrice(tick.ask, precision)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Spread</p>
            <p className="font-semibold text-foreground">{formatPrice(tick.ask - tick.bid, precision)}</p>
          </div>
        </div>

        {tick.isClosed && (
          <div className="mt-2 rounded bg-warning/10 p-2 text-xs text-warning border border-warning/30">
            Market Closed
          </div>
        )}
      </div>
    </LiquidGlassCard>
  )
}
