import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface LiquidGlassCardProps {
  children: ReactNode
  className?: string
  interactive?: boolean
  glowEffect?: boolean
  hoverEffect?: boolean
}

export function LiquidGlassCard({
  children,
  className,
  interactive = true,
  glowEffect = false,
  hoverEffect = true,
}: LiquidGlassCardProps) {
  return (
    <div
      className={cn(
        'glass relative rounded-lg p-5 transition-all duration-300',
        interactive && 'cursor-pointer',
        glowEffect && 'shadow-glow',
        hoverEffect && 'hover:shadow-glow-lg hover:border-primary/30',
        className,
      )}
    >
      {glowEffect && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 to-transparent opacity-0 animate-liquid-flow" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
