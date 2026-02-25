'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperienceFormProps {
  onSubmit: (data: {
    leadId: string
    startDate: string
    endDate: string
    skillFocus: 'hitting' | 'pitching' | 'two_way'
    notes?: string
  }) => Promise<void>
  onClose: () => void
  leads: { id: string; name: string }[]
}

export default function ExperienceForm({ onSubmit, onClose, leads }: ExperienceFormProps) {
  const [leadId, setLeadId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [skillFocus, setSkillFocus] = useState<'hitting' | 'pitching' | 'two_way'>('two_way')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId || !startDate || !endDate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({ leadId, startDate, endDate, skillFocus, notes: notes || undefined })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experience')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="panel-bottom z-50 max-h-[85vh] overflow-y-auto scrollbar-thin pb-safe animate-slide-up">
        <div
          className="sticky top-0 z-10 px-4 pt-3 pb-2 rounded-t-3xl"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: 'var(--text-placeholder)' }} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Experience</h2>
            <button onClick={onClose} className="btn-icon shrink-0" aria-label="Close">
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Athlete Select */}
          <div>
            <label className="section-label mb-1 block">Athlete *</label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="select"
            >
              <option value="">Select an athlete...</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-1 block">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="section-label mb-1 block">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Skill Focus */}
          <div>
            <label className="section-label mb-2 block">Skill Focus *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['hitting', 'pitching', 'two_way'] as const).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSkillFocus(skill)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
                  )}
                  style={{
                    borderColor: skillFocus === skill ? 'var(--accent-blue)' : 'var(--border-light)',
                    background: skillFocus === skill
                      ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)'
                      : 'var(--bg-elevated)',
                    color: skillFocus === skill ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    boxShadow: skillFocus === skill ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {skill === 'two_way' ? 'Two-Way' : skill.charAt(0).toUpperCase() + skill.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="section-label mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any special notes for this experience..."
              className="input resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Creating...' : 'Create Experience'}
          </button>
        </form>
      </div>
    </>
  )
}
