'use client'

import React, { useState } from 'react'
import { LiquidGlassCard } from './liquid-glass-card'
import { DERIV_SYMBOLS, CATEGORY_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SymbolSelectorProps {
  selectedSymbol: string | null
  onSymbolSelect: (symbolCode: string) => void
}

export function SymbolSelector({ selectedSymbol, onSymbolSelect }: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(DERIV_SYMBOLS.map((s) => s.category)))
  const filteredSymbols = category
    ? DERIV_SYMBOLS.filter((s) => s.category === category)
    : DERIV_SYMBOLS

  const selected = DERIV_SYMBOLS.find((s) => s.code === selectedSymbol)

  const handleSelectSymbol = (symbolCode: string) => {
    onSymbolSelect(symbolCode)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'glass w-full rounded-lg p-4 flex items-center justify-between transition-all duration-300',
          'hover:border-primary/50 hover:bg-white/[calc(var(--glass-opacity)*1.5)]',
          isOpen && 'border-primary/50 bg-white/[calc(var(--glass-opacity)*1.5)]',
        )}
      >
        <div className="text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Trading Pair</p>
          <p className="text-lg font-semibold text-foreground">
            {selected?.displayName || 'Select Symbol'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-300',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-lg p-4 z-50 backdrop-blur-xl">
          {/* Category Filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                category === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/20 text-foreground hover:bg-muted/30',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors capitalize',
                  category === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 text-foreground hover:bg-muted/30',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Symbol List */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredSymbols.map((symbol) => (
              <button
                key={symbol.id}
                onClick={() => handleSelectSymbol(symbol.code)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded transition-colors',
                  selectedSymbol === symbol.code
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'hover:bg-muted/20 text-foreground',
                )}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{symbol.displayName}</p>
                    <p className="text-xs text-muted-foreground">{symbol.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[symbol.category]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
