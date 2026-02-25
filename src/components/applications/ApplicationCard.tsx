'use client'

import { Clock, Video, ChevronRight, Zap } from 'lucide-react'
import { cn, formatRelativeTime, getTemperatureDotClass } from '@/lib/utils'
import type { ApplicationWithLead } from '@/hooks/useApplications'
import type { LeadTemperature } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700' },
  under_review: { bg: 'bg-amber-100', text: 'text-amber-700' },
  accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  need_more_info: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  need_more_info: 'More Info',
}

interface ApplicationCardProps {
  application: ApplicationWithLead
  onClick: (application: ApplicationWithLead) => void
}

export default function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const style = STATUS_STYLES[application.status] || STATUS_STYLES.submitted
  const label = STATUS_LABELS[application.status] || application.status

  return (
    <button
      onClick={() => onClick(application)}
      className="card-interactive w-full p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Top row: athlete name + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-base font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {application.athlete_name || application.contact_name || 'Unknown'}
            </h3>
            <span className={cn('badge', style.bg, style.text)}>
              {label}
            </span>
            {application.video_url && (
              <Video size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--accent-blue)' }} />
            )}
          </div>

          {/* Athlete details */}
          {(application.athlete_level || application.athlete_age) && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Zap size={14} strokeWidth={1.75} className="mr-1 inline" style={{ color: 'var(--accent-blue)' }} />
              {application.athlete_age ? `Age ${application.athlete_age}` : ''}
              {application.athlete_age && application.athlete_level ? ' — ' : ''}
              {application.athlete_level
                ? application.athlete_level.replace('_', ' ')
                : ''}
            </p>
          )}

          {/* Temperature dot */}
          {application.lead_temperature && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn('status-dot', getTemperatureDotClass(application.lead_temperature as LeadTemperature))} />
              <span
                className="text-xs font-medium capitalize"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {application.lead_temperature}
              </span>
            </div>
          )}

          {/* Meta row */}
          <div className="mt-2.5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.75} />
              {formatRelativeTime(application.submitted_at)}
            </span>
          </div>
        </div>

        <ChevronRight size={20} strokeWidth={1.75} className="mt-1 shrink-0" style={{ color: 'var(--text-placeholder)' }} />
      </div>
    </button>
  )
}
