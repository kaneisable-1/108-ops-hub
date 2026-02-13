'use client'

import { Mic, MicOff, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void
  transcript: string
}

export default function VoiceRecorder({ onTranscriptChange, transcript }: VoiceRecorderProps) {
  const { isRecording, isSupported, error, startRecording, stopRecording, clearTranscript } =
    useVoiceRecorder()

  const handleStart = () => {
    startRecording()
  }

  const handleStop = () => {
    stopRecording()
  }

  const handleClear = () => {
    clearTranscript()
    onTranscriptChange('')
  }

  if (!isSupported) {
    return (
      <p className="text-xs text-gray-400 italic">
        Voice recording not available in this browser. Use text input below.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {isRecording ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Record Voice
            </>
          )}
        </button>

        {transcript && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Listening...
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {transcript && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
          {transcript}
        </div>
      )}
    </div>
  )
}
