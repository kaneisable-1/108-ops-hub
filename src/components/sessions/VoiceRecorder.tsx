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
      <p className="text-xs italic" style={{ color: 'var(--text-placeholder)' }}>
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
            'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
            isRecording
              ? 'bg-red-500 text-white animate-pulse-soft'
              : ''
          )}
          style={!isRecording ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
        >
          {isRecording ? (
            <>
              <MicOff size={16} strokeWidth={1.75} />
              Stop Recording
            </>
          ) : (
            <>
              <Mic size={16} strokeWidth={1.75} />
              Record Voice
            </>
          )}
        </button>

        {transcript && (
          <button
            type="button"
            onClick={handleClear}
            className="btn-icon"
            style={{ color: 'var(--text-placeholder)' }}
            aria-label="Clear transcript"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-xs animate-fade-in" style={{ color: 'var(--color-danger)' }}>
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-soft" />
          Listening...
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
      )}

      {transcript && (
        <div
          className="rounded-lg p-3 text-sm max-h-32 overflow-y-auto scrollbar-thin animate-fade-in"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          {transcript}
        </div>
      )}
    </div>
  )
}
