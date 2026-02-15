'use client'

import { Clock, Video, ChevronRight, Zap } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { ApplicationWithLead } from '@/hooks/useApplications'

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  submitted: { bg: 'bg-gray-100', text: 'text-gray-700' },
  under_review: { bg: 'bg-gray-200', text: 'text-gray-700' },
  accepted: { bg: 'bg-gray-900', text: 'text-white' },
  rejected: { bg: 'bg-gray-400', text: 'text-white' },
  need_more_info: { bg: 'bg-gray-300', text: 'text-gray-800' },
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
      className="card w-full p-4 text-left transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Top row: athlete name + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {application.athlete_name || application.contact_name || 'Unknown'}
            </h3>
            <span className={cn('badge', style.bg, style.text)}>
              {label}
            </span>
            {application.video_url && (
              <Video className="h-4 w-4 text-brand-500 shrink-0" />
            )}
          </div>

          {/* Athlete details */}
          {(application.athlete_level || application.athlete_age) && (
            <p className="mt-1 text-sm text-gray-600">
              <Zap className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
              {application.athlete_age ? `Age ${application.athlete_age}` : ''}
              {application.athlete_age && application.athlete_level ? ' — ' : ''}
              {application.athlete_level
                ? application.athlete_level.replace('_', ' ')
                : ''}
            </p>
          )}

          {/* Temperature badge */}
          {application.lead_temperature && (
            <div className="mt-1.5">
              <span className={cn(
                'badge text-xs',
                application.lead_temperature === 'hot' && 'bg-gray-900 text-white',
                application.lead_temperature === 'warm' && 'bg-gray-200 text-gray-700',
                application.lead_temperature === 'cold' && 'bg-gray-100 text-gray-500',
              )}>
                {application.lead_temperature.toUpperCase()}
              </span>
            </div>
          )}

          {/* Meta row */}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(application.submitted_at)}
            </span>
          </div>
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </button>
  )
}
