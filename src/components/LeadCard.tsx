'use client'

import {
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  User,
} from 'lucide-react'
import { cn, formatRelativeTime, getTemperatureDotClass, getServiceLabel, formatPhoneNumber } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const tempDotClass = getTemperatureDotClass(lead.lead_temperature)

  return (
    <button
      onClick={() => onClick(lead)}
      className="card-interactive w-full max-w-card p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left content */}
        <div className="min-w-0 flex-1">
          {/* Top row: name + status dot */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {lead.contact_name || 'Unknown Contact'}
            </h3>
            <span className={cn('status-dot', tempDotClass)} />
            <span className="text-xs font-medium capitalize" style={{ color: 'var(--text-tertiary)' }}>
              {lead.lead_temperature}
            </span>
            {lead.status === 'new' && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-sm"
                style={{ background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-success)' }}
              >
                NEW
              </span>
            )}
          </div>

          {/* Claimed by */}
          {lead.claimed_by && lead.claimed_by_name && (
            <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <User size={12} strokeWidth={1.75} />
              <span>{lead.claimed_by_name}</span>
            </div>
          )}

          {/* Athlete info */}
          {lead.athlete_name && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lead.athlete_name}
              {lead.athlete_age ? `, ${lead.athlete_age}` : ''}
              {lead.athlete_position ? ` — ${lead.athlete_position}` : ''}
              {lead.athlete_level ? ` (${lead.athlete_level.replace('_', ' ')})` : ''}
            </p>
          )}

          {/* AI Summary */}
          {lead.ai_summary && (
            <p className="mt-1.5 text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {lead.ai_summary}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.75} />
              {formatRelativeTime(lead.inbound_at || lead.created_at)}
            </span>
            {lead.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} strokeWidth={1.75} />
                {lead.location}
                {lead.distance_hours ? ` (${lead.distance_hours}h)` : ''}
              </span>
            )}
            {lead.contact_phone && (
              <span className="hidden sm:flex items-center gap-1">
                <Phone size={12} strokeWidth={1.75} />
                {formatPhoneNumber(lead.contact_phone)}
              </span>
            )}
          </div>

          {/* Service match + tags */}
          {(lead.service_match || lead.tags.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lead.service_match && lead.service_match !== 'unknown' && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-sm"
                  style={{ background: 'var(--accent-blue-tint)', color: 'var(--accent-blue)' }}
                >
                  {getServiceLabel(lead.service_match)}
                </span>
              )}
              {lead.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-2 py-0.5 rounded-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: arrow */}
        <ChevronRight size={16} strokeWidth={1.75} className="mt-1 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </button>
  )
}
