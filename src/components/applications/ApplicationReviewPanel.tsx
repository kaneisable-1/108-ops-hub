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
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        {/* Handle + Header */}
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{athleteName}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500">
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
                <h3 className="text-xs font-semibold uppercase text-gray-400">Video</h3>
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
            <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Athlete</h3>
            <div className="space-y-1.5">
              {application.athlete_name && (
                <p className="text-sm text-gray-900 font-medium">{application.athlete_name}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
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
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Contact</h3>
              {application.contact_name && (
                <p className="text-sm text-gray-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-400" />
                  {application.contact_name}
                </p>
              )}
              {application.contact_phone && (
                <a
                  href={`tel:${application.contact_phone}`}
                  className="mt-1 flex items-center gap-1.5 text-sm text-brand-600"
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
                <h3 className="text-xs font-semibold uppercase text-gray-400">
                  Application Responses
                </h3>
                {responsesExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {responsesExpanded && (
                <div className="mt-3 space-y-3 divide-y divide-gray-100">
                  {Object.entries(application.responses!).map(([key, value]) => (
                    <div key={key} className="pt-2 first:pt-0">
                      <dt className="text-xs font-medium text-gray-500 capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-900">
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
            <div className="card border-gray-300 p-4">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Previous Review</h3>
              {application.reviewed_by && (
                <p className="text-xs text-gray-500 mb-1">
                  Reviewed by: {application.reviewed_by}
                  {application.reviewed_at && ` — ${formatRelativeTime(application.reviewed_at)}`}
                </p>
              )}
              <p className="text-sm text-gray-700">{application.review_notes}</p>
              {application.decision_reason && (
                <p className="mt-1 text-sm text-gray-500 italic">{application.decision_reason}</p>
              )}
            </div>
          )}

          {/* Decision Form */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">
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
    submitted: 'bg-gray-100 text-gray-700',
    under_review: 'bg-gray-200 text-gray-700',
    accepted: 'bg-gray-900 text-white',
    rejected: 'bg-gray-400 text-white',
    need_more_info: 'bg-gray-300 text-gray-800',
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
