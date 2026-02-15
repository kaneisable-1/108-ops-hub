'use client'

import {
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  User,
  Zap,
} from 'lucide-react'
import { cn, formatRelativeTime, getTemperatureBadgeClass, getServiceLabel, formatPhoneNumber } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const temperatureClass = getTemperatureBadgeClass(lead.lead_temperature)

  return (
    <button
      onClick={() => onClick(lead)}
      className="card w-full p-4 text-left transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left content */}
        <div className="min-w-0 flex-1">
          {/* Top row: name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {lead.contact_name || 'Unknown Contact'}
            </h3>
            <span className={temperatureClass}>
              {lead.lead_temperature.toUpperCase()}
            </span>
            {lead.status === 'new' && (
              <span className="badge bg-gray-900 text-white">NEW</span>
            )}
            {lead.claimed_by && lead.claimed_by_name && (
              <span className="badge bg-gray-200 text-gray-700">
                <User className="mr-1 h-3 w-3" />
                {lead.claimed_by_name}
              </span>
            )}
          </div>

          {/* Athlete info */}
          {lead.athlete_name && (
            <p className="mt-1 text-sm text-gray-600">
              <Zap className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
              {lead.athlete_name}
              {lead.athlete_age ? `, ${lead.athlete_age}` : ''}
              {lead.athlete_position ? ` — ${lead.athlete_position}` : ''}
              {lead.athlete_level ? ` (${lead.athlete_level.replace('_', ' ')})` : ''}
            </p>
          )}

          {/* AI Summary */}
          {lead.ai_summary && (
            <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
              {lead.ai_summary}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(lead.inbound_at || lead.created_at)}
            </span>
            {lead.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.location}
                {lead.distance_hours ? ` (${lead.distance_hours}h)` : ''}
              </span>
            )}
            {lead.contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhoneNumber(lead.contact_phone)}
              </span>
            )}
          </div>

          {/* Service match + tags */}
          {(lead.service_match || lead.tags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lead.service_match && lead.service_match !== 'unknown' && (
                <span className="badge bg-brand-50 text-brand-700">
                  {getServiceLabel(lead.service_match)}
                </span>
              )}
              {lead.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="badge bg-gray-100 text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: arrow */}
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </button>
  )
}
