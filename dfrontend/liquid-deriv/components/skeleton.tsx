'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted/20 border border-muted/30',
        className,
      )}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-lg p-5 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="glass rounded-lg p-5 space-y-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
