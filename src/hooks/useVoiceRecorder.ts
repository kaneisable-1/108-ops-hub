'use client'

import { useState, useRef, useCallback } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  transcript: string
  isSupported: boolean
  error: string | null
  startRecording: () => void
  stopRecording: () => void
  clearTranscript: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser')
      return
    }

    setError(null)

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = transcript

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(finalTranscript + interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`Voice recording error: ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setTranscript(finalTranscript)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isSupported, transcript])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isRecording,
    transcript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  }
}
