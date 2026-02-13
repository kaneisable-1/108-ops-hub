'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

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
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Experience</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Athlete Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Athlete *</label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="input"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Skill Focus *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['hitting', 'pitching', 'two_way'] as const).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSkillFocus(skill)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    skillFocus === skill
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {skill === 'two_way' ? 'Two-Way' : skill.charAt(0).toUpperCase() + skill.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
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
            <p className="text-sm text-red-600">{error}</p>
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
