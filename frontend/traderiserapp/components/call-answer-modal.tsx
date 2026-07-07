"use client"

import { useState } from "react"
import { answerAudioCall } from "@/lib/api"
import { toast } from "sonner"
import { Phone, Mic } from "lucide-react"

interface CallAnswerModalProps {
  callId: number
  onClose: () => void
  onCallAnswered: (voicePreset: string) => void
}

const voiceOptions = [
  { value: "default", label: "Default Voice", emoji: "🗣️" },
  { value: "lady", label: "Lady Voice", emoji: "👩" },
  { value: "man", label: "Man Voice", emoji: "👨" },
  { value: "child", label: "Child Voice", emoji: "👦" },
]

export default function CallAnswerModal({ callId, onClose, onCallAnswered }: CallAnswerModalProps) {
  const [selectedVoice, setSelectedVoice] = useState("default")
  const [isAnswering, setIsAnswering] = useState(false)

  const handleAnswer = async () => {
    setIsAnswering(true)
    try {
      await answerAudioCall(callId, selectedVoice)
      toast.success(`Call answered with ${selectedVoice} voice`)
      onCallAnswered(selectedVoice)
      onClose()
    } catch (err) {
      toast.error("Failed to answer call")
    } finally {
      setIsAnswering(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Incoming Audio Call</h2>
          <p className="text-gray-600 mt-2">Choose your voice preset</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {voiceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedVoice(option.value)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                selectedVoice === option.value 
                  ? "border-green-600 bg-green-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-3xl">{option.emoji}</span>
              <span className="font-medium text-sm">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-gray-300 font-medium"
          >
            Decline
          </button>
          <button
            onClick={handleAnswer}
            disabled={isAnswering}
            className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Mic className="w-5 h-5" />
            {isAnswering ? "Connecting..." : "Answer Call"}
          </button>
        </div>
      </div>
    </div>
  )
}