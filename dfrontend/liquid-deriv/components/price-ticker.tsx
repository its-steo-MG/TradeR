'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/utils'

interface PriceTickerProps {
  price: number
  previousPrice: number
  symbol: string
  precision?: number
}

export function PriceTicker({
  price,
  previousPrice,
  symbol,
  precision = 5,
}: PriceTickerProps) {
  const [isUp, setIsUp] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (price !== previousPrice) {
      const priceIsUp = price > previousPrice
      setIsUp(priceIsUp)
      setShowAnimation(true)

      const timeout = setTimeout(() => {
        setShowAnimation(false)
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [price, previousPrice])

  const change = price - previousPrice
  const changePercent = ((change / previousPrice) * 100).toFixed(4)

  return (
    <div className="space-y-2">
      <motion.div
        className={`text-5xl font-bold font-mono ${
          showAnimation ? (isUp ? 'text-success' : 'text-error') : 'text-foreground'
        }`}
        animate={{
          scale: showAnimation ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {formatPrice(price, precision)}
      </motion.div>

      {showAnimation && (
        <motion.div
          className={`flex items-center gap-2 text-sm font-semibold ${
            isUp ? 'text-success' : 'text-error'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <span>{isUp ? '↑' : '↓'}</span>
          <span>{formatPrice(Math.abs(change), precision)}</span>
          <span>({changePercent}%)</span>
        </motion.div>
      )}
    </div>
  )
}
