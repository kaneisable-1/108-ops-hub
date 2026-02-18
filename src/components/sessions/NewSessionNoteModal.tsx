'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, Save, Loader2, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { NoteMode, CoachSentiment, Skill } from '@/types'
import SentimentPicker from './SentimentPicker'

interface NewSessionNoteModalProps {
  coachId: string
  coachName: string
  athletes: { id: string; name: string }[]
  onSaved: () => void
  onClose: () => void
}

export default function NewSessionNoteModal({
  coachId,
  coachName,
  athletes,
  onSaved,
  onClose,
}: NewSessionNoteModalProps) {
  const [mode, setMode] = useState<NoteMode>('quick')
  const [leadId, setLeadId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [skill, setSkill] = useState<Skill>('hitting')
  const [rawNotes, setRawNotes] = useState('')
  const [sentiment, setSentiment] = useState<CoachSentiment | null>(null)
  const [sentimentReason, setSentimentReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extended mode fields
  const [drillsPerformed, setDrillsPerformed] = useState<string[]>([])
  const [drillInput, setDrillInput] = useState('')
  const [keyObservations, setKeyObservations] = useState('')
  const [cuesGiven, setCuesGiven] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [effortRating, setEffortRating] = useState<number | null>(null)
  const [injuryNotes, setInjuryNotes] = useState('')

  const canSave = leadId && sentiment && sentimentReason.trim().length > 0

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
      const input = {
        lead_id: leadId,
        coach_id: coachId,
        date,
        skill,
        raw_notes: rawNotes || undefined,
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

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[480px] sm:max-h-none sm:rounded-none sm:rounded-l-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl sm:rounded-none">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Session Note</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-500">{coachName}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Athlete selection */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Athlete</label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="input w-full"
            >
              <option value="">Select athlete...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Date and skill */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Skill</label>
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value as Skill)}
                className="input w-full"
              >
                <option value="hitting">Hitting</option>
                <option value="pitching">Pitching</option>
              </select>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Notes</h3>
            <button
              type="button"
              onClick={() => setMode(mode === 'quick' ? 'extended' : 'quick')}
              className="flex items-center gap-1 text-xs text-gray-900 font-medium"
            >
              {mode === 'quick' ? (
                <>Extended <ChevronDown className="h-3 w-3" /></>
              ) : (
                <>Quick <ChevronUp className="h-3 w-3" /></>
              )}
            </button>
          </div>

          {/* Text notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Session Notes</label>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Type or dictate session notes..."
              className="input w-full resize-none"
              rows={4}
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
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {/* Drills */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Drills Performed</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={drillInput}
                    onChange={(e) => setDrillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrill())}
                    placeholder="Add a drill..."
                    className="input flex-1"
                  />
                  <button type="button" onClick={handleAddDrill} className="btn-secondary text-xs px-3">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {drillsPerformed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {drillsPerformed.map((drill, i) => (
                      <span
                        key={i}
                        className="badge bg-gray-100 text-gray-700 text-xs cursor-pointer hover:bg-gray-200"
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
                <label className="text-xs text-gray-500 mb-1 block">Key Observations</label>
                <textarea
                  value={keyObservations}
                  onChange={(e) => setKeyObservations(e.target.value)}
                  placeholder="What stood out about performance?"
                  className="input w-full resize-none"
                  rows={2}
                />
              </div>

              {/* Cues Given */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cues Given</label>
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
                <label className="text-xs text-gray-500 mb-1 block">Recommendations</label>
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
                <label className="text-xs text-gray-500 mb-1 block">Athlete Effort (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEffortRating(n)}
                      className={cn(
                        'h-10 w-10 rounded-xl text-sm font-semibold transition-all',
                        effortRating === n
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Injury Notes */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Injury / Limitation Notes</label>
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
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

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
              <><Save className="h-4 w-4" /> Save Session Note</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
