'use client'

import { useState } from 'react'
import { X, Phone, Video, Clock, User, ChevronDown } from 'lucide-react'
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
        className="fixed inset-0 z-40 backdrop transition-all duration-300 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="panel-bottom z-50 max-h-[90vh] overflow-y-auto scrollbar-thin pb-safe animate-slide-up"
        style={{ borderTop: '1px solid var(--border-light)' }}
      >
        {/* Handle + Header */}
        <div
          className="sticky top-0 z-10 px-4 pt-3 pb-2 rounded-t-3xl"
          style={{
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <div
            className="mx-auto mb-2 h-1 w-10 rounded-full"
            style={{ background: 'var(--text-placeholder)' }}
          />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {athleteName}
            </h2>
            <button
              onClick={onClose}
              className="btn-icon shrink-0"
              aria-label="Close"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} strokeWidth={1.75} className="mr-1 inline" />
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
                <Video size={16} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
                <h3 className="section-label">Video</h3>
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
            <h3 className="section-label mb-2">Athlete</h3>
            <div className="space-y-1.5">
              {application.athlete_name && (
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {application.athlete_name}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {application.athlete_age && <span>Age {application.athlete_age}</span>}
                {application.athlete_level && (
                  <span className="capitalize">{application.athlete_level.replace('_', ' ')}</span>
                )}
                {application.lead_temperature && (
                  <span className={cn(
                    'badge text-xs',
                    application.lead_temperature === 'hot' && 'bg-gray-900 text-white',
                    application.lead_temperature === 'warm' && 'bg-gray-200 text-gray-700',
                    application.lead_temperature === 'cold' && 'bg-gray-100 text-gray-500',
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
              <h3 className="section-label mb-2">Contact</h3>
              {application.contact_name && (
                <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <User size={16} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                  {application.contact_name}
                </p>
              )}
              {application.contact_phone && (
                <a
                  href={`tel:${application.contact_phone}`}
                  className="mt-1 flex items-center gap-1.5 text-sm transition-colors duration-200"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  <Phone size={16} strokeWidth={1.75} />
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
                className="flex w-full items-center justify-between cursor-pointer"
              >
                <h3 className="section-label">Application Responses</h3>
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  className={cn(
                    'transition-transform duration-200 ease-apple',
                    responsesExpanded && 'rotate-180'
                  )}
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </button>
              {responsesExpanded && (
                <div className="mt-3 space-y-3 animate-fade-in" style={{ borderTop: '1px solid var(--border-light)' }}>
                  {Object.entries(application.responses!).map(([key, value]) => (
                    <div key={key} className="pt-2 first:pt-3">
                      <dt
                        className="text-xs font-medium capitalize"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
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

          {/* Previous review info */}
          {alreadyReviewed && application.review_notes && (
            <div className="card p-4" style={{ border: '1px solid var(--border-medium)' }}>
              <h3 className="section-label mb-2">Previous Review</h3>
              {application.reviewed_by && (
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Reviewed by: {application.reviewed_by}
                  {application.reviewed_at && ` — ${formatRelativeTime(application.reviewed_at)}`}
                </p>
              )}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {application.review_notes}
              </p>
              {application.decision_reason && (
                <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                  {application.decision_reason}
                </p>
              )}
            </div>
          )}

          {/* Decision Form */}
          <div className="card p-4">
            <h3 className="section-label mb-3">
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
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-amber-100 text-amber-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    need_more_info: 'bg-purple-100 text-purple-700',
  }
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Rejected',
    need_more_info: 'More Info',
  }

  return (
    <span className={cn('badge text-xs', styles[status] || 'bg-gray-100 text-gray-600')}>
      {labels[status] || status}
    </span>
  )
}
