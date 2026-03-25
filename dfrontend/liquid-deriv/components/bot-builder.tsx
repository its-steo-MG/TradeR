'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useBot } from '@/hooks/use-bot'
import { useDerivStore } from '@/lib/store'
import { DERIV_SYMBOLS, CONTRACT_TYPES, DURATION_UNITS, STAKE_PRESETS, DURATION_PRESETS } from '@/lib/constants'
import type { BotConfig } from '@/lib/types'
import { LiquidGlassCard } from './liquid-glass-card'
import { GlassButton } from './glass-button'

export function BotBuilder() {
  const { createBot, isLoading } = useBot()
  const { addNotification } = useDerivStore()

  const [config, setConfig] = useState<BotConfig>({
    name: '',
    description: '',
    type: 'custom',
    symbol: 'EURUSD',
    contractType: 'CALL',
    stake: 10,
    durationUnit: 'minutes',
    duration: 5,
    enabled: true,
  })

  const [step, setStep] = useState(1)

  const handleConfigChange = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateBot = async () => {
    if (!config.name.trim()) {
      addNotification({
        type: 'error',
        message: 'Bot name is required',
        title: 'Validation Error',
      })
      return
    }

    const result = await createBot(config)
    if (result) {
      setConfig({
        name: '',
        description: '',
        type: 'custom',
        symbol: 'EURUSD',
        contractType: 'CALL',
        stake: 10,
        durationUnit: 'minutes',
        duration: 5,
        enabled: true,
      })
      setStep(1)
    }
  }

  const selectedSymbol = DERIV_SYMBOLS.find((s) => s.code === config.symbol)
  const selectedContract = CONTRACT_TYPES.find((c) => c.code === config.contractType)

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LiquidGlassCard className="p-6">
          <h2 className="text-2xl font-bold gradient-text mb-2">Create Trading Bot</h2>
          <p className="text-muted-foreground">Build and deploy automated trading strategies</p>
        </LiquidGlassCard>
      </motion.div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            whileHover={{ scale: 1.05 }}
            onClick={() => setStep(s)}
            className={`flex-1 h-2 rounded-full cursor-pointer transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <LiquidGlassCard className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bot Name *</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                placeholder="My Trading Bot"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={config.description || ''}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                placeholder="Describe your bot strategy..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bot Type</label>
              <div className="flex gap-2">
                {(['deriv', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleConfigChange('type', type)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      config.type === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary'
                    }`}
                  >
                    {type === 'deriv' ? 'Deriv Bot' : 'Custom Bot'}
                  </button>
                ))}
              </div>
            </div>
          </LiquidGlassCard>

          <div className="flex justify-between">
            <GlassButton disabled>Previous</GlassButton>
            <GlassButton onClick={() => setStep(2)}>Next</GlassButton>
          </div>
        </motion.div>
      )}

      {/* Step 2: Trading Config */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <LiquidGlassCard className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <select
                  value={config.symbol}
                  onChange={(e) => handleConfigChange('symbol', e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DERIV_SYMBOLS.map((symbol) => (
                    <option key={symbol.code} value={symbol.code}>
                      {symbol.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contract Type</label>
                <select
                  value={config.contractType}
                  onChange={(e) => handleConfigChange('contractType', e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CONTRACT_TYPES.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stake (USD)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={config.stake}
                    onChange={(e) => handleConfigChange('stake', parseFloat(e.target.value))}
                    min="1"
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {STAKE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleConfigChange('stake', preset)}
                      className="px-2 py-1 text-xs bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration Unit</label>
                <select
                  value={config.durationUnit}
                  onChange={(e) => handleConfigChange('durationUnit', e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DURATION_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.duration}
                  onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                  min="1"
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {DURATION_PRESETS[config.durationUnit as keyof typeof DURATION_PRESETS]?.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleConfigChange('duration', preset)}
                    className="px-2 py-1 text-xs bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </LiquidGlassCard>

          <div className="flex justify-between">
            <GlassButton onClick={() => setStep(1)}>Previous</GlassButton>
            <GlassButton onClick={() => setStep(3)}>Next</GlassButton>
          </div>
        </motion.div>
      )}

      {/* Step 3: Advanced Settings */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <LiquidGlassCard className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Trades (Optional)</label>
                <input
                  type="number"
                  value={config.maxTrades || ''}
                  onChange={(e) => handleConfigChange('maxTrades', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1"
                  placeholder="Unlimited"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Take Profit (%) (Optional)</label>
                <input
                  type="number"
                  value={config.takeProfit || ''}
                  onChange={(e) => handleConfigChange('takeProfit', e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.1"
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stop Loss (%) (Optional)</label>
                <input
                  type="number"
                  value={config.stopLoss || ''}
                  onChange={(e) => handleConfigChange('stopLoss', e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.1"
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Bot Name:</span> <span className="font-medium">{config.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Trading:</span> <span className="font-medium">{config.stake} USD on {config.symbol}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Duration:</span> <span className="font-medium">{config.duration} {config.durationUnit}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{config.type}</span>
                </p>
              </div>
            </div>
          </LiquidGlassCard>

          <div className="flex justify-between">
            <GlassButton onClick={() => setStep(2)}>Previous</GlassButton>
            <GlassButton onClick={handleCreateBot} isLoading={isLoading} variant="accent">
              Create Bot
            </GlassButton>
          </div>
        </motion.div>
      )}
    </div>
  )
}
