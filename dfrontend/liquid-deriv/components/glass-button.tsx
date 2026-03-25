'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  glowEffect?: boolean
  fullWidth?: boolean
}

export function GlassButton({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  glowEffect = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}: GlassButtonProps) {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow',
    secondary: 'glass bg-secondary/20 text-foreground hover:bg-secondary/30',
    danger: 'bg-error text-white hover:bg-error/90',
    ghost: 'hover:bg-muted/20 text-foreground',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        glowEffect && 'shadow-glow hover:shadow-glow-lg',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
