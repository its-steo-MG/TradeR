'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Phone, PhoneOff } from 'lucide-react'

interface VoicePreset {
  id: string
  label: string
  emoji: string
  description: string
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'default',
    label: 'Default',
    emoji: '🤖',
    description: 'Standard voice',
  },
  {
    id: 'lady',
    label: 'Lady',
    emoji: '👩',
    description: 'Female voice',
  },
  {
    id: 'man',
    label: 'Man',
    emoji: '👨',
    description: 'Male voice',
  },
  {
    id: 'child',
    label: 'Child',
    emoji: '👦',
    description: 'Child voice',
  },
]

interface CallAnswerModalProps {
  onAnswer: (voicePreset: string) => Promise<void> | void
  onDecline: () => void
}

export function CallAnswerModal({ onAnswer, onDecline }: CallAnswerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('default')
  const [isAnswering, setIsAnswering] = useState(false)

  // Play incoming call sound
  useEffect(() => {
    const audio = new Audio('/audio/incoming-call.mp3')
    audio.loop = true
    audio.play().catch((err) => console.error('[v0] Failed to play incoming call sound:', err))
    return () => {
      audio.pause()
    }
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
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-blue-50 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="animate-pulse">
              <Phone className="h-6 w-6 text-green-500" />
            </div>
            Incoming Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Voice selection grid */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Select voice preset:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                    selectedPreset === preset.id
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-teal-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                  }`}
                >
                  <div className="text-3xl mb-2">{preset.emoji}</div>
                  <div className="text-xs font-bold text-gray-900">
                    {preset.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-100 text-gray-700"
              disabled={isAnswering}
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              onClick={handleAnswer}
              className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
              disabled={isAnswering}
            >
              <Phone className="mr-2 h-4 w-4" />
              {isAnswering ? 'Answering...' : 'Answer Call'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
