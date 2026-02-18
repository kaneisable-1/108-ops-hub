'use client'

import { useState } from 'react'
import { X, Phone, Video, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatRelativeTime, formatPhoneNumber } from '@/lib/utils'
import type { ApplicationWithLead } from '@/hooks/useApplications'
import DecisionForm from './DecisionForm'

interface ApplicationReviewPanelProps {
  application: ApplicationWithLead
  onClose: () => void
  onDecision: (
    applicationId: string,
    decision: 'accepted' | 'rejected' | 'need_more_info',
    reviewedBy: string,
    reviewNotes?: string,
    decisionReason?: string
  ) => Promise<void>
}

export default function ApplicationReviewPanel({
  application,
  onClose,
  onDecision,
}: ApplicationReviewPanelProps) {
  const [responsesExpanded, setResponsesExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const athleteName = application.athlete_name || application.contact_name || 'Unknown'
  const hasResponses = application.responses && Object.keys(application.responses).length > 0
  const alreadyReviewed = ['accepted', 'rejected', 'need_more_info'].includes(application.status)

  const handleDecision = async (
    decision: 'accepted' | 'rejected' | 'need_more_info',
    reviewNotes?: string,
    decisionReason?: string
  ) => {
    setSubmitting(true)
    try {
      // Use 'coordinator' as reviewed_by for now; replace with real user later
      await onDecision(application.id, decision, 'coordinator', reviewNotes, decisionReason)
      onClose()
    } catch {
      // Error handled by parent hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl pb-safe shadow-xl" style={{ background: 'var(--surface-card)' }}>
        {/* Handle + Header */}
        <div className="sticky top-0 z-10 px-4 pt-3 pb-2 rounded-t-3xl" style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}>
          <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: 'var(--text-muted)' }} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{athleteName}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors" style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              {formatRelativeTime(application.submitted_at)}
            </span>
            <StatusBadge status={application.status} />
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Video */}
          {application.video_url && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <Video className="h-4 w-4 text-brand-500" />
                <h3 className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Video</h3>
              </div>
              <video
                src={application.video_url}
                controls
                className="w-full"
                preload="metadata"
              />
            </div>
          )}

          {/* Athlete Info */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Athlete</h3>
            <div className="space-y-1.5">
              {application.athlete_name && (
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{application.athlete_name}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {application.athlete_age && <span>Age {application.athlete_age}</span>}
                {application.athlete_level && (
                  <span className="capitalize">{application.athlete_level.replace('_', ' ')}</span>
                )}
                {application.lead_temperature && (
                  <span className={cn(
                    'badge text-xs',
                    application.lead_temperature === 'hot' && 'bg-red-500/15 text-red-400',
                    application.lead_temperature === 'warm' && 'bg-amber-500/15 text-amber-400',
                    application.lead_temperature === 'cold' && 'bg-blue-500/15 text-blue-400',
                  )}>
                    {application.lead_temperature.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          {(application.contact_name || application.contact_phone) && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Contact</h3>
              {application.contact_name && (
                <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  {application.contact_name}
                </p>
              )}
              {application.contact_phone && (
                <a
                  href={`tel:${application.contact_phone}`}
                  className="mt-1 flex items-center gap-1.5 text-sm text-brand-400"
                >
                  <Phone className="h-4 w-4" />
                  {formatPhoneNumber(application.contact_phone)}
                </a>
              )}
            </div>
          )}

          {/* Application Responses */}
          {hasResponses && (
            <div className="card p-4">
              <button
                onClick={() => setResponsesExpanded(!responsesExpanded)}
                className="flex w-full items-center justify-between"
              >
                <h3 className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Application Responses
                </h3>
                {responsesExpanded ? (
                  <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
              {responsesExpanded && (
                <div className="mt-3 space-y-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  {Object.entries(application.responses!).map(([key, value]) => (
                    <div key={key} className="pt-2 first:pt-0">
                      <dt className="text-xs font-medium capitalize" style={{ color: 'var(--text-tertiary)' }}>
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Previous review info (if already reviewed) */}
          {alreadyReviewed && application.review_notes && (
            <div className="card p-4" style={{ border: '1px solid var(--surface-border-strong)' }}>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Previous Review</h3>
              {application.reviewed_by && (
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Reviewed by: {application.reviewed_by}
                  {application.reviewed_at && ` — ${formatRelativeTime(application.reviewed_at)}`}
                </p>
              )}
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{application.review_notes}</p>
              {application.decision_reason && (
                <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>{application.decision_reason}</p>
              )}
            </div>
          )}

          {/* Decision Form */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
              {alreadyReviewed ? 'Update Decision' : 'Make Decision'}
            </h3>
            <DecisionForm onSubmit={handleDecision} loading={submitting} />
          </div>
        </div>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-500/15 text-blue-400',
    under_review: 'bg-amber-500/15 text-amber-400',
    accepted: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
    need_more_info: 'bg-purple-500/15 text-purple-400',
  }
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Rejected',
    need_more_info: 'More Info',
  }

  return (
    <span className={cn('badge text-xs', styles[status] || 'bg-white/10 text-white/60')}>
      {labels[status] || status}
    </span>
  )
}
