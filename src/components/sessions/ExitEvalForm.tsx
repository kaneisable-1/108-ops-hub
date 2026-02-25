'use client'

import { useState } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExitEvalFormProps {
  sessionId: string
  athleteName: string
  onSaved: () => void
}

export default function ExitEvalForm({ sessionId, athleteName, onSaved }: ExitEvalFormProps) {
  const [progressRating, setProgressRating] = useState<number | null>(null)
  const [behavioral, setBehavioral] = useState('')
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [finalNotes, setFinalNotes] = useState('')
  const [wouldWorkAgain, setWouldWorkAgain] = useState<string | null>(null)
  const [skillImprovements, setSkillImprovements] = useState({ hitting: '', pitching: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = progressRating && recommendation && wouldWorkAgain

  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/sessions/exit-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          progress_rating: progressRating,
          goals_achieved: {},
          skill_improvements: skillImprovements,
          behavioral_assessment: behavioral,
          recommendation,
          final_notes: finalNotes,
          would_work_again: wouldWorkAgain,
        }),
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
      <div className="card p-4 border-gray-300 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">Exit evaluation submitted</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4 border-gray-300">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={20} strokeWidth={1.75} className="text-purple-500" />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Exit Evaluation — {athleteName}</h3>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Final day. Complete this evaluation for the athlete.</p>

      {/* Progress Rating */}
      <div>
        <label className="section-label mb-1 block">Overall Progress (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setProgressRating(n)}
              className={cn(
                'h-10 w-10 rounded-lg text-sm font-semibold tabular-nums transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
                progressRating === n
                  ? 'bg-purple-500 text-white shadow-sm'
                  : ''
              )}
              style={progressRating !== n ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Improvements */}
      <div>
        <label className="section-label mb-1 block">Hitting Improvements</label>
        <textarea
          value={skillImprovements.hitting}
          onChange={(e) => setSkillImprovements({ ...skillImprovements, hitting: e.target.value })}
          placeholder="What improved in hitting?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>
      <div>
        <label className="section-label mb-1 block">Pitching Improvements</label>
        <textarea
          value={skillImprovements.pitching}
          onChange={(e) => setSkillImprovements({ ...skillImprovements, pitching: e.target.value })}
          placeholder="What improved in pitching?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>

      {/* Behavioral Assessment */}
      <div>
        <label className="section-label mb-1 block">Behavioral Assessment</label>
        <textarea
          value={behavioral}
          onChange={(e) => setBehavioral(e.target.value)}
          placeholder="Coachability, effort, attitude..."
          className="input w-full resize-none"
          rows={2}
        />
      </div>

      {/* Recommendation */}
      <div>
        <label className="section-label mb-2 block">Recommendation</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'reenroll', label: 'Re-enroll', color: 'border-emerald-200 text-emerald-700', active: 'bg-emerald-500 text-white border-emerald-500 shadow-sm' },
            { value: 'graduate', label: 'Graduate', color: 'border-blue-200 text-blue-700', active: 'bg-blue-500 text-white border-blue-500 shadow-sm' },
            { value: 'not_a_fit', label: 'Not a Fit', color: 'border-red-200 text-red-700', active: 'bg-red-500 text-white border-red-500 shadow-sm' },
            { value: 'different_program', label: 'Different Program', color: 'border-amber-200 text-amber-700', active: 'bg-amber-500 text-white border-amber-500 shadow-sm' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommendation(opt.value)}
              className={cn(
                'rounded-lg border-2 p-2 text-sm font-medium transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
                recommendation === opt.value ? opt.active : opt.color
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Would work again */}
      <div>
        <label className="section-label mb-2 block">Would you work with this athlete again?</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'yes', label: 'Yes' },
            { value: 'with_conditions', label: 'With Conditions' },
            { value: 'no', label: 'No' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWouldWorkAgain(opt.value)}
              className={cn(
                'rounded-lg border-2 p-2 text-xs font-medium transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
                wouldWorkAgain === opt.value
                  ? 'text-white shadow-sm'
                  : ''
              )}
              style={{
                ...(wouldWorkAgain === opt.value
                  ? { background: 'var(--text-primary)', borderColor: 'var(--text-primary)', color: '#FFFFFF' }
                  : { borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Final Notes */}
      <div>
        <label className="section-label mb-1 block">Final Notes</label>
        <textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Summary of the athlete's experience..."
          className="input w-full resize-none"
          rows={3}
        />
      </div>

      {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
          canSave ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm' : 'cursor-not-allowed'
        )}
        style={!canSave ? { background: 'var(--bg-secondary)', color: 'var(--text-placeholder)' } : undefined}
      >
        {saving ? (
          <><Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> Submitting...</>
        ) : (
          <><ClipboardCheck size={16} strokeWidth={1.75} /> Submit Exit Evaluation</>
        )}
      </button>
    </div>
  )
}
