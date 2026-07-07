'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Phone, PhoneOff } from 'lucide-react'

const VOICE_PRESETS = [
  { id: 'default', label: 'Default', emoji: '🤖', description: 'Standard Voice' },
  { id: 'lady', label: 'Lady', emoji: '👩', description: 'Female Voice' },
  { id: 'man', label: 'Man', emoji: '👨', description: 'Male Voice' },
  { id: 'child', label: 'Child', emoji: '👦', description: 'Child Voice' },
]

interface CallAnswerModalProps {
  onAnswer: (voicePreset: string) => Promise<void> | void
  onDecline: () => void
}

export function CallAnswerModal({ onAnswer, onDecline }: CallAnswerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('default')
  const [isAnswering, setIsAnswering] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const playRing = async () => {
      try {
        audioRef.current = new Audio('/audio/incoming-call.mp3')
        audioRef.current.loop = true
        await audioRef.current.play()
      } catch (err) {
        console.warn('Autoplay prevented by browser')
      }
    }
    playRing()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handleAnswer = async () => {
    if (audioRef.current) audioRef.current.pause()
    setIsAnswering(true)
    try {
      await onAnswer(selectedPreset)
    } catch (error) {
      console.error('Answer failed:', error)
    } finally {
      setIsAnswering(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onDecline}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-zinc-900 to-black border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Phone className="h-6 w-6 text-green-500 animate-pulse" />
            Incoming Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <p className="text-sm font-semibold text-white/70 mb-4">Choose Voice Preset:</p>
            <div className="grid grid-cols-2 gap-3">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    selectedPreset === preset.id 
                      ? 'border-green-500 bg-green-950/50' 
                      : 'border-white/10 hover:border-white/30 bg-zinc-900'
                  }`}
                >
                  <div className="text-4xl mb-3">{preset.emoji}</div>
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-xs text-white/60">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/5 text-white"
              disabled={isAnswering}
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              onClick={handleAnswer}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isAnswering}
            >
              <Phone className="mr-2 h-4 w-4" />
              {isAnswering ? 'Connecting...' : 'Answer Call'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}