'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScheduleSlotEnriched, NoteMode, CoachSentiment, SessionNoteInput } from '@/types'
import VoiceRecorder from './VoiceRecorder'
import SentimentPicker from './SentimentPicker'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface SessionNoteFormProps {
  slot: ScheduleSlotEnriched
  coachId: string
  onSaved: () => void
  existingNotes?: string
}

export default function SessionNoteForm({ slot, coachId, onSaved, existingNotes }: SessionNoteFormProps) {
  const [mode, setMode] = useState<NoteMode>('quick')
  const [rawNotes, setRawNotes] = useState(existingNotes || '')
  const [sentiment, setSentiment] = useState<CoachSentiment | null>(null)
  const [sentimentReason, setSentimentReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extended mode fields
  const [drillsPerformed, setDrillsPerformed] = useState<string[]>([])
  const [drillInput, setDrillInput] = useState('')
  const [keyObservations, setKeyObservations] = useState('')
  const [cuesGiven, setCuesGiven] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [effortRating, setEffortRating] = useState<number | null>(null)
  const [injuryNotes, setInjuryNotes] = useState('')

  const { transcript } = useVoiceRecorder()

  const canSave = sentiment && sentimentReason.trim().length > 0

  const handleAddDrill = () => {
    if (drillInput.trim()) {
      setDrillsPerformed([...drillsPerformed, drillInput.trim()])
      setDrillInput('')
    }
  }

  const handleRemoveDrill = (index: number) => {
    setDrillsPerformed(drillsPerformed.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setError(null)

    try {
      const input: SessionNoteInput = {
        schedule_slot_id: slot.id,
        lead_id: slot.lead_id,
        coach_id: coachId,
        date: slot.date,
        skill: slot.skill,
        raw_notes: rawNotes || undefined,
        voice_transcript: transcript || undefined,
        note_mode: mode,
        coach_sentiment: sentiment,
        sentiment_reason: sentimentReason,
        ...(mode === 'extended' && {
          drills_performed: drillsPerformed,
          key_observations: keyObservations || undefined,
          cues_given: cuesGiven || undefined,
          recommendations: recommendations || undefined,
          athlete_effort_rating: effortRating || undefined,
          injury_notes: injuryNotes || undefined,
        }),
      }

      const res = await fetch('/api/sessions/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="card p-4 border-steel-300 bg-steel-50">
        <p className="text-sm font-medium text-steel-700">Session notes saved</p>
        <p className="text-xs text-steel-500 mt-1">AI parsing in progress...</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-steel-400">Session Notes</h3>
        <button
          type="button"
          onClick={() => setMode(mode === 'quick' ? 'extended' : 'quick')}
          className="flex items-center gap-1 text-xs text-navy-500 font-medium"
        >
          {mode === 'quick' ? (
            <>Extended <ChevronDown className="h-3 w-3" /></>
          ) : (
            <>Quick <ChevronUp className="h-3 w-3" /></>
          )}
        </button>
      </div>

      {/* Voice recorder */}
      <VoiceRecorder
        onTranscriptChange={() => {}}
        transcript={transcript}
      />

      {/* Text notes */}
      <div>
        <label className="text-xs text-steel-500 mb-1 block">Notes</label>
        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Type session notes here..."
          className="input w-full resize-none"
          rows={3}
        />
      </div>

      {/* Sentiment picker */}
      <SentimentPicker
        value={sentiment}
        reason={sentimentReason}
        onSentimentChange={setSentiment}
        onReasonChange={setSentimentReason}
      />

      {/* Extended mode fields */}
      {mode === 'extended' && (
        <div className="space-y-4 border-t border-steel-100 pt-4">
          {/* Drills */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Drills Performed</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={drillInput}
                onChange={(e) => setDrillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrill())}
                placeholder="Add a drill..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleAddDrill}
                className="btn-secondary text-xs px-3"
              >
                Add
              </button>
            </div>
            {drillsPerformed.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {drillsPerformed.map((drill, i) => (
                  <span
                    key={i}
                    className="badge bg-steel-100 text-steel-700 text-xs cursor-pointer hover:bg-steel-200 hover:text-navy-500"
                    onClick={() => handleRemoveDrill(i)}
                  >
                    {drill} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Key Observations */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Key Observations</label>
            <textarea
              value={keyObservations}
              onChange={(e) => setKeyObservations(e.target.value)}
              placeholder="What did you notice about the athlete's performance?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Cues Given */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Cues Given</label>
            <textarea
              value={cuesGiven}
              onChange={(e) => setCuesGiven(e.target.value)}
              placeholder="What coaching cues did you use?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Recommendations</label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="What should the athlete work on next?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* Effort Rating */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Athlete Effort (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEffortRating(n)}
                  className={cn(
                    'h-10 w-10 rounded-xl text-sm font-semibold transition-all',
                    effortRating === n
                      ? 'bg-navy-500 text-white'
                      : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Injury Notes */}
          <div>
            <label className="text-xs text-steel-500 mb-1 block">Injury / Limitation Notes (optional)</label>
            <textarea
              value={injuryNotes}
              onChange={(e) => setInjuryNotes(e.target.value)}
              placeholder="Any injuries or physical limitations noted?"
              className="input w-full resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'btn-primary w-full flex items-center justify-center gap-2',
          !canSave && 'opacity-50 cursor-not-allowed'
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save Session Notes</>
        )}
      </button>
    </div>
  )
}
