'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  duration: number
  rotation: number
  size: number
}

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (trigger) {
      const newPieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.2,
        duration: 2 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        size: 4 + Math.random() * 8,
      }))
      setPieces(newPieces)

      const timeout = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [trigger, onComplete])

  if (pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{
            left: `${piece.left}%`,
            top: '-20px',
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            top: '100vh',
            opacity: 0,
            rotate: piece.rotation,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeIn',
          }}
          className="absolute w-1 h-1 bg-primary rounded-full"
          style={{
            width: `${piece.size}px`,
            height: `${piece.size}px`,
          }}
        />
      ))}
    </div>
  )
}
