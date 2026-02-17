'use client'

import {
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  User,
  ExternalLink,
} from 'lucide-react'
import { cn, formatRelativeTime, getTemperatureBadgeClass, getServiceLabel, formatPhoneNumber, getGHLContactUrl } from '@/lib/utils'
import type { Lead } from '@/types'

const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
  const temperatureClass = getTemperatureBadgeClass(lead.lead_temperature)
  const hasRealGHLContact = lead.ghl_contact_id && !lead.ghl_contact_id.startsWith('manual_')

  return (
    <div className="card w-full p-3 text-left transition-all hover:shadow-card-hover md:p-4">
      <div className="flex items-start gap-3">
        {/* Temperature indicator stripe */}
        <div
          className={cn(
            'mt-0.5 h-10 w-1 shrink-0 rounded-full',
            lead.lead_temperature === 'hot' && 'bg-red-500',
            lead.lead_temperature === 'warm' && 'bg-amber-400',
            lead.lead_temperature === 'cold' && 'bg-steel-300'
          )}
        />

        {/* Content — clickable for detail panel */}
        <button
          onClick={() => onClick(lead)}
          className="min-w-0 flex-1 text-left cursor-pointer active:scale-[0.995]"
        >
          {/* Top row: name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-navy-500 truncate">
              {lead.contact_name || 'Unknown Contact'}
            </h3>
            <span className={temperatureClass}>
              {lead.lead_temperature.toUpperCase()}
            </span>
            {lead.status === 'new' && (
              <span className="badge-new">NEW</span>
            )}
            {lead.claimed_by && lead.claimed_by_name && (
              <span className="badge-claimed">
                <User className="mr-0.5 h-3 w-3" />
                {lead.claimed_by_name}
              </span>
            )}
          </div>

          {/* Athlete info — single line */}
          {lead.athlete_name && (
            <p className="mt-0.5 truncate text-xs text-steel-500">
              {lead.athlete_name}
              {lead.athlete_age ? `, ${lead.athlete_age}` : ''}
              {lead.athlete_position ? ` — ${lead.athlete_position}` : ''}
              {lead.athlete_level ? ` (${lead.athlete_level.replace('_', ' ')})` : ''}
            </p>
          )}

          {/* AI Summary — 1 line on mobile, 2 on desktop */}
          {lead.ai_summary && (
            <p className="mt-1 text-xs text-steel-400 line-clamp-1 md:line-clamp-2">
              {lead.ai_summary}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-steel-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(lead.inbound_at || lead.created_at)}
            </span>
            {lead.location && (
              <span className="hidden items-center gap-1 sm:flex">
                <MapPin className="h-3 w-3" />
                {lead.location}
                {lead.distance_hours ? ` (${lead.distance_hours}h)` : ''}
              </span>
            )}
            {lead.contact_phone && (
              <span className="hidden items-center gap-1 sm:flex">
                <Phone className="h-3 w-3" />
                {formatPhoneNumber(lead.contact_phone)}
              </span>
            )}
          </div>

          {/* Service match + tags */}
          {(lead.service_match || lead.tags.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lead.service_match && lead.service_match !== 'unknown' && (
                <span className="badge bg-navy-50 text-navy-600 text-[10px]">
                  {getServiceLabel(lead.service_match)}
                </span>
              )}
              {lead.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="badge bg-steel-100 text-steel-500 text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>

        {/* Right side: Call button + arrow */}
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          {/* Call button — one-tap opens GHL contact */}
          {hasRealGHLContact && (
            <a
              href={getGHLContactUrl(lead.ghl_contact_id, GHL_LOCATION_ID)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                lead.lead_temperature === 'hot'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200'
                  : 'bg-navy-50 text-navy-500 hover:bg-navy-100 active:bg-navy-200'
              )}
              aria-label="Open in GHL"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => onClick(lead)}
            className="flex h-9 w-5 items-center justify-center text-steel-300 cursor-pointer"
            aria-label="View details"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
