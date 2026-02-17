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
      <div className="card p-4 border-steel-300 bg-steel-50">
        <p className="text-sm font-medium text-steel-700">Exit evaluation submitted</p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4 border-steel-300">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-steel-500" />
        <h3 className="text-sm font-bold text-navy-500">Exit Evaluation — {athleteName}</h3>
      </div>
      <p className="text-xs text-steel-500">Final day. Complete this evaluation for the athlete.</p>

      {/* Progress Rating */}
      <div>
        <label className="text-xs text-steel-500 mb-1 block">Overall Progress (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setProgressRating(n)}
              className={cn(
                'h-10 w-10 rounded-xl text-sm font-semibold transition-all',
                progressRating === n
                  ? 'bg-navy-500 text-white'
                  : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Improvements */}
      <div>
        <label className="text-xs text-steel-500 mb-1 block">Hitting Improvements</label>
        <textarea
          value={skillImprovements.hitting}
          onChange={(e) => setSkillImprovements({ ...skillImprovements, hitting: e.target.value })}
          placeholder="What improved in hitting?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>
      <div>
        <label className="text-xs text-steel-500 mb-1 block">Pitching Improvements</label>
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
        <label className="text-xs text-steel-500 mb-1 block">Behavioral Assessment</label>
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
        <label className="text-xs text-steel-500 mb-2 block">Recommendation</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'reenroll', label: 'Re-enroll', color: 'border-steel-200 text-steel-700', active: 'bg-navy-500 text-white border-navy-500' },
            { value: 'graduate', label: 'Graduate', color: 'border-steel-200 text-steel-600', active: 'bg-navy-700 text-white border-navy-700' },
            { value: 'not_a_fit', label: 'Not a Fit', color: 'border-steel-200 text-steel-500', active: 'bg-steel-500 text-white border-steel-500' },
            { value: 'different_program', label: 'Different Program', color: 'border-steel-200 text-steel-500', active: 'bg-steel-400 text-white border-steel-400' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommendation(opt.value)}
              className={cn(
                'rounded-xl border-2 p-2 text-sm font-medium transition-all',
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
        <label className="text-xs text-steel-500 mb-2 block">Would you work with this athlete again?</label>
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
                'rounded-xl border-2 p-2 text-xs font-medium transition-all',
                wouldWorkAgain === opt.value
                  ? 'bg-navy-500 text-white border-navy-500'
                  : 'border-steel-200 text-steel-600 hover:bg-steel-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Final Notes */}
      <div>
        <label className="text-xs text-steel-500 mb-1 block">Final Notes</label>
        <textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Summary of the athlete's experience..."
          className="input w-full resize-none"
          rows={3}
        />
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
          canSave ? 'bg-navy-500 text-white hover:bg-navy-700' : 'bg-steel-200 text-steel-400 cursor-not-allowed'
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
        ) : (
          <><ClipboardCheck className="h-4 w-4" /> Submit Exit Evaluation</>
        )}
      </button>
    </div>
  )
}
