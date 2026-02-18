'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { SessionEnriched } from '@/types'

interface SessionCardProps {
  session: SessionEnriched
  onClick: (session: SessionEnriched) => void
}

const sentimentBadge: Record<string, { bg: string; label: string }> = {
  green: { bg: 'bg-emerald-500/15 text-emerald-400', label: 'Green' },
  yellow: { bg: 'bg-amber-500/15 text-amber-400', label: 'Yellow' },
  red: { bg: 'bg-red-500/15 text-red-400', label: 'Red' },
}

export default function SessionCard({ session, onClick }: SessionCardProps) {
  const dateLabel = format(new Date(session.date + 'T00:00:00'), 'MMM d, yyyy')
  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null
  const athleteName = session.athlete_name || session.contact_name || 'Unknown'

  // Show a preview of parsed notes or raw notes
  const preview = session.parsed_notes?.observations?.[0]
    || session.raw_notes?.slice(0, 80)
    || 'No notes'

  return (
    <button
      onClick={() => onClick(session)}
      className="card p-4 w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{athleteName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {session.coach_name || 'Unknown Coach'} &middot; {dateLabel} &middot; {session.skill}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sentiment && (
            <span className={cn('badge text-xs', sentiment.bg)}>
              {sentiment.label}
            </span>
          )}
          {session.is_exit_eval && (
            <span className="badge bg-purple-500/15 text-purple-400 text-xs">Exit</span>
          )}
          {session.ai_parsed_at && (
            <span className="badge bg-blue-500/15 text-blue-400 text-xs">AI</span>
          )}
        </div>
      </div>

      <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{preview}</p>
    </button>
  )
}
