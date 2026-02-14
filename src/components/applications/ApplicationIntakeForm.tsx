'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ApplicationIntakeFormProps {
  leads: { id: string; name: string }[]
  onSubmit: (data: {
    leadId: string
    trainingGoals: string
    currentTeam: string
    howHeard: string
    injuryHistory: string
    parentGuardian: string
    videoUrl?: string
  }) => Promise<void>
  onClose: () => void
}

export default function ApplicationIntakeForm({
  leads,
  onSubmit,
  onClose,
}: ApplicationIntakeFormProps) {
  const [leadId, setLeadId] = useState('')
  const [trainingGoals, setTrainingGoals] = useState('')
  const [currentTeam, setCurrentTeam] = useState('')
  const [howHeard, setHowHeard] = useState('')
  const [injuryHistory, setInjuryHistory] = useState('')
  const [parentGuardian, setParentGuardian] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId || !trainingGoals) {
      setError('Please select an athlete and describe training goals')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        leadId,
        trainingGoals,
        currentTeam,
        howHeard,
        injuryHistory,
        parentGuardian,
        videoUrl: videoUrl || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Application</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Athlete Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Athlete *
            </label>
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

          {/* Training Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Training Goals *
            </label>
            <textarea
              value={trainingGoals}
              onChange={(e) => setTrainingGoals(e.target.value)}
              rows={3}
              placeholder="What does the athlete want to improve? (e.g., hitting mechanics, pitch velocity, arm care)"
              className="input resize-none"
            />
          </div>

          {/* Current Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Team / Organization
            </label>
            <input
              type="text"
              value={currentTeam}
              onChange={(e) => setCurrentTeam(e.target.value)}
              placeholder="e.g., Farragut HS, TN Mavericks, UTK"
              className="input"
            />
          </div>

          {/* How They Heard */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How did they hear about 108?
            </label>
            <select
              value={howHeard}
              onChange={(e) => setHowHeard(e.target.value)}
              className="input"
            >
              <option value="">Select...</option>
              <option value="referral">Referral / Word of Mouth</option>
              <option value="social_media">Social Media</option>
              <option value="google">Google Search</option>
              <option value="event">Event / Showcase</option>
              <option value="coach_recommendation">Coach Recommendation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Injury History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injury History
            </label>
            <textarea
              value={injuryHistory}
              onChange={(e) => setInjuryHistory(e.target.value)}
              rows={2}
              placeholder="Any current or past injuries relevant to training..."
              className="input resize-none"
            />
          </div>

          {/* Parent/Guardian */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent / Guardian
            </label>
            <input
              type="text"
              value={parentGuardian}
              onChange={(e) => setParentGuardian(e.target.value)}
              placeholder="Name and relationship (if athlete is a minor)"
              className="input"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Link
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="input"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>
      </div>
    </>
  )
}
