'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus, Phone, User, Mic, MicOff, Check, Loader2, Search } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { useLeadSearch } from '@/hooks/useLeadSearch'

type Mode = null | 'new_lead' | 'log_call'
type CallOutcome = 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number'

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'answered', label: 'Answered' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong #' },
]

interface QuickCaptureProps {
  onComplete: () => void
}

export default function QuickCapture({ onComplete }: QuickCaptureProps) {
  const [mode, setMode] = useState<Mode>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New Lead fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Log Call fields
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [selectedLeadName, setSelectedLeadName] = useState('')
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('answered')
  const [callPhone, setCallPhone] = useState('')

  const { results: searchResults, loading: searchLoading } = useLeadSearch(searchQuery)
  const { isRecording, transcript, isSupported, startRecording, stopRecording, clearTranscript } = useVoiceRecorder()

  const nameInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'new_lead') nameInputRef.current?.focus()
    if (mode === 'log_call') searchInputRef.current?.focus()
  }, [mode])

  const reset = () => {
    setMode(null)
    setSaving(false)
    setSuccess(false)
    setError(null)
    setName('')
    setPhone('')
    setSearchQuery('')
    setSelectedLeadId(null)
    setSelectedLeadName('')
    setCallOutcome('answered')
    setCallPhone('')
    clearTranscript()
    if (isRecording) stopRecording()
  }

  const handleClose = () => {
    if (isRecording) stopRecording()
    reset()
    onComplete()
  }

  const handleNewLead = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const endpoint = transcript.trim()
        ? '/api/call-capture/extract'
        : '/api/call-capture/manual'

      const body = transcript.trim()
        ? { text: `New lead: ${name}, phone: ${phone}. ${transcript}` }
        : { contact_name: name.trim(), contact_phone: phone.trim() }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save lead')

      setSuccess(true)
      setTimeout(handleClose, 1200)
    } catch {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  const handleLogCall = async () => {
    if (!transcript.trim()) {
      setError('Record a voice note about the call')
      return
    }
    if (!selectedLeadId && !callPhone.trim()) {
      setError('Select an existing lead or enter a phone number')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/call-capture/post-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId || undefined,
          contact_name: selectedLeadName || undefined,
          contact_phone: callPhone || undefined,
          voice_transcript: transcript,
          call_outcome: callOutcome,
        }),
      })

      if (!res.ok) throw new Error('Failed to save call')

      setSuccess(true)
      setTimeout(handleClose, 1200)
    } catch {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  // Success overlay
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 animate-in zoom-in">
          <Check className="h-10 w-10 text-white" />
        </div>
      </div>
    )
  }

  // Mode selector (bottom sheet)
  if (mode === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={handleClose}>
        <div
          className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-10 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-steel-300" />
          <button
            onClick={() => setMode('new_lead')}
            className="flex w-full items-center gap-4 rounded-xl bg-navy-50 p-4 text-left transition hover:bg-navy-100 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-500 text-white">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-navy-900">New Lead</div>
              <div className="text-sm text-steel-500">Quick add a name &amp; phone</div>
            </div>
          </button>
          <button
            onClick={() => setMode('log_call')}
            className="flex w-full items-center gap-4 rounded-xl bg-navy-50 p-4 text-left transition hover:bg-navy-100 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-navy-900">Log a Call</div>
              <div className="text-sm text-steel-500">Record what happened on a call</div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // New Lead form
  if (mode === 'new_lead') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={handleClose}>
        <div
          className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-10 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">New Lead</h2>
            <button onClick={handleClose} className="p-1 text-steel-400 hover:text-steel-600 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <input
            ref={nameInputRef}
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-steel-200 px-4 py-3 text-navy-900 placeholder:text-steel-400 focus:border-navy-400 focus:outline-none focus:ring-1 focus:ring-navy-400"
          />

          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-steel-200 px-4 py-3 text-navy-900 placeholder:text-steel-400 focus:border-navy-400 focus:outline-none focus:ring-1 focus:ring-navy-400"
          />

          {/* Voice note (optional) */}
          <VoiceNoteSection
            isRecording={isRecording}
            isSupported={isSupported}
            transcript={transcript}
            onStart={startRecording}
            onStop={stopRecording}
            onClear={clearTranscript}
            label="Add a voice note (optional)"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleNewLead}
            disabled={saving}
            className="w-full rounded-lg bg-navy-500 py-3 font-semibold text-white transition hover:bg-navy-400 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Save Lead'}
          </button>
        </div>
      </div>
    )
  }

  // Log Call form
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Log a Call</h2>
          <button onClick={handleClose} className="p-1 text-steel-400 hover:text-steel-600 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-steel-600">Who did you call?</label>
          {selectedLeadId ? (
            <div className="flex items-center justify-between rounded-lg border border-navy-200 bg-navy-50 px-4 py-3">
              <span className="font-medium text-navy-900">{selectedLeadName}</span>
              <button
                onClick={() => { setSelectedLeadId(null); setSelectedLeadName(''); setSearchQuery('') }}
                className="text-sm text-steel-500 hover:text-steel-700 cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-steel-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search existing leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-steel-200 py-3 pl-9 pr-4 text-navy-900 placeholder:text-steel-400 focus:border-navy-400 focus:outline-none focus:ring-1 focus:ring-navy-400"
              />
              {searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-steel-200 bg-white shadow-lg">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-steel-400" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedLeadId(r.id)
                          setSelectedLeadName(r.contact_name || 'Unknown')
                          setCallPhone(r.contact_phone || '')
                          setSearchQuery('')
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-steel-50 cursor-pointer"
                      >
                        <span className="font-medium text-navy-900">{r.contact_name || 'Unknown'}</span>
                        <span className="text-sm text-steel-400">{r.contact_phone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-steel-500">No leads found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {!selectedLeadId && (
            <input
              type="tel"
              placeholder="Or enter phone number for new lead"
              value={callPhone}
              onChange={(e) => setCallPhone(e.target.value)}
              className="w-full rounded-lg border border-steel-200 px-4 py-3 text-navy-900 placeholder:text-steel-400 focus:border-navy-400 focus:outline-none focus:ring-1 focus:ring-navy-400"
            />
          )}
        </div>

        {/* Call outcome */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-steel-600">Call outcome</label>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                onClick={() => setCallOutcome(o.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                  callOutcome === o.value
                    ? 'bg-navy-500 text-white'
                    : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice note */}
        <VoiceNoteSection
          isRecording={isRecording}
          isSupported={isSupported}
          transcript={transcript}
          onStart={startRecording}
          onStop={stopRecording}
          onClear={clearTranscript}
          label="Tell me what happened on the call"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleLogCall}
          disabled={saving}
          className="w-full rounded-lg bg-navy-500 py-3 font-semibold text-white transition hover:bg-navy-400 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Save Call Summary'}
        </button>
      </div>
    </div>
  )
}

function VoiceNoteSection({
  isRecording,
  isSupported,
  transcript,
  onStart,
  onStop,
  onClear,
  label,
}: {
  isRecording: boolean
  isSupported: boolean
  transcript: string
  onStart: () => void
  onStop: () => void
  onClear: () => void
  label: string
}) {
  if (!isSupported) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-steel-600">{label}</label>
      <div className="flex items-center gap-3">
        <button
          onClick={isRecording ? onStop : onStart}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
          }`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <span className="text-sm text-steel-500">
          {isRecording ? 'Listening... tap to stop' : transcript ? 'Tap to add more' : 'Tap to record'}
        </span>
      </div>
      {transcript && (
        <div className="relative rounded-lg bg-steel-50 p-3">
          <p className="pr-8 text-sm text-navy-800">{transcript}</p>
          <button
            onClick={onClear}
            className="absolute right-2 top-2 text-steel-400 hover:text-steel-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
