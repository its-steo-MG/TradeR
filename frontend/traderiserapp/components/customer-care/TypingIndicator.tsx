'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Phone, PhoneOff } from 'lucide-react'

interface VoicePreset { id: string; label: string; emoji: string; description: string }

const VOICE_PRESETS: VoicePreset[] = [
  { id: 'default', label: 'Default', emoji: '🤖', description: 'Standard voice' },
  { id: 'lady', label: 'Lady', emoji: '👩', description: 'Female voice' },
  { id: 'man', label: 'Man', emoji: '👨', description: 'Male voice' },
  { id: 'child', label: 'Child', emoji: '👦', description: 'Child voice' },
]

interface CallAnswerModalProps {
  onAnswer: (voicePreset: string) => Promise<void> | void
  onDecline: () => void
}

export function CallAnswerModal({ onAnswer, onDecline }: CallAnswerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('default')
  const [isAnswering, setIsAnswering] = useState(false)

  useEffect(() => {
    const audio = new Audio('/audio/incoming-call.mp3')
    audio.loop = true
    audio.play().catch((err) => console.error('Failed to play incoming call sound:', err))
    return () => { audio.pause() }
  }, [])

  const handleAnswer = async () => {
    try {
      setIsAnswering(true)
      await onAnswer(selectedPreset)
    } catch (error) {
      console.error('Failed to answer call:', error)
      setIsAnswering(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onDecline}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="animate-pulse"><Phone className="h-6 w-6 text-emerald-500" /></div>
            Incoming Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300 mb-4">Select voice preset:</p>
            <div className="grid grid-cols-2 gap-3">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedPreset === preset.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{preset.emoji}</div>
                  <div className="text-xs font-bold">{preset.label}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onDecline} variant="outline" className="flex-1 border-slate-200 dark:border-zinc-700" disabled={isAnswering}>
              <PhoneOff className="mr-2 h-4 w-4" /> Decline
            </Button>
            <Button onClick={handleAnswer} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white" disabled={isAnswering}>
              <Phone className="mr-2 h-4 w-4" /> {isAnswering ? 'Answering...' : 'Answer Call'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
