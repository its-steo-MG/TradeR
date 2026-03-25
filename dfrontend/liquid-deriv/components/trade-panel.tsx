'use client'

import React, { useState, useEffect } from 'react'
import { LiquidGlassCard } from './liquid-glass-card'
import { GlassButton } from './glass-button'
import { SymbolSelector } from './symbol-selector'
import { useDerivStore } from '@/lib/store'
import { useDerivAPI } from '@/hooks/use-deriv'
import { CONTRACT_TYPES, DURATION_UNITS, STAKE_PRESETS, DURATION_PRESETS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function TradePanel() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedContractType,
    setSelectedContractType,
    stake,
    setStake,
    duration,
    setDuration,
    durationUnit,
    setDurationUnit,
  } = useDerivStore()

  const { fetchProposal, isProposalLoading } = useDerivAPI()
  const [stakeInput, setStakeInput] = useState(stake.toString())
  const [durationInput, setDurationInput] = useState(duration.toString())

  useEffect(() => {
    setStakeInput(stake.toString())
  }, [stake])

  useEffect(() => {
    setDurationInput(duration.toString())
  }, [duration])

  const handleRequestQuote = async () => {
    if (!selectedSymbol || !selectedContractType) return

    const numStake = parseFloat(stakeInput) || stake
    const numDuration = parseFloat(durationInput) || duration

    setStake(numStake)
    setDuration(numDuration)

    await fetchProposal(selectedSymbol, selectedContractType, numStake, numDuration, durationUnit)
  }

  const durationOptions = DURATION_PRESETS[durationUnit as keyof typeof DURATION_PRESETS] || []

  return (
    <div className="space-y-4">
      {/* Symbol Selection */}
      <SymbolSelector selectedSymbol={selectedSymbol} onSymbolSelect={setSelectedSymbol} />

      {/* Contract Type Selection */}
      <LiquidGlassCard>
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Contract Type
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedContractType(type.code)}
                className={cn(
                  'p-3 rounded-lg text-sm font-medium transition-all duration-300',
                  selectedContractType === type.code
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'glass hover:border-primary/30',
                )}
              >
                <div>{type.name}</div>
                <div className="text-xs opacity-75">{type.code}</div>
              </button>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Stake Input */}
      <LiquidGlassCard>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stake</h3>
            <span className="text-xs text-muted-foreground">USD</span>
          </div>

          <input
            type="number"
            value={stakeInput}
            onChange={(e) => setStakeInput(e.target.value)}
            placeholder="Enter stake"
            className={cn(
              'glass w-full rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'appearance-none',
            )}
          />

          <div className="grid grid-cols-4 gap-2">
            {STAKE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setStakeInput(preset.toString())}
                className={cn(
                  'px-2 py-1 rounded text-sm transition-colors',
                  stakeInput === preset.toString()
                    ? 'bg-primary/20 border border-primary/50 text-primary'
                    : 'bg-muted/10 border border-muted/30 hover:bg-muted/20',
                )}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Duration Selection */}
      <LiquidGlassCard>
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</h3>

          {/* Duration Unit Tabs */}
          <div className="flex gap-2 mb-3">
            {DURATION_UNITS.map((unit) => (
              <button
                key={unit.value}
                onClick={() => setDurationUnit(unit.value as any)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                  durationUnit === unit.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/10 text-foreground hover:bg-muted/20',
                )}
              >
                {unit.label}
              </button>
            ))}
          </div>

          {/* Duration Input */}
          <input
            type="number"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            placeholder="Enter duration"
            className={cn(
              'glass w-full rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'appearance-none',
            )}
          />

          {/* Duration Presets */}
          <div className="grid grid-cols-5 gap-1">
            {durationOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setDurationInput(opt.toString())}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  durationInput === opt.toString()
                    ? 'bg-primary/20 border border-primary/50 text-primary'
                    : 'bg-muted/10 border border-muted/30 hover:bg-muted/20',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Request Quote Button */}
      <GlassButton
        onClick={handleRequestQuote}
        isLoading={isProposalLoading}
        disabled={!selectedSymbol || !selectedContractType}
        variant="primary"
        fullWidth
        glowEffect
        size="lg"
      >
        Request Quote
      </GlassButton>
    </div>
  )
}
