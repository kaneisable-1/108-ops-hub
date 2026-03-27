'use client'

import {
  Clock,
  Phone,
  ChevronRight,
  User,
  DollarSign,
} from 'lucide-react'
import { cn, formatRelativeTime, getDealStatusLabel, getDealStatusColor, formatCents, getServiceLabel, formatPhoneNumber, getBillingLabel } from '@/lib/utils'
import type { Deal } from '@/types'

interface DealCardProps {
  deal: Deal
  onClick: (deal: Deal) => void
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const statusColor = getDealStatusColor(deal.status)

  return (
    <button
      onClick={() => onClick(deal)}
      className="card-interactive w-full max-w-card p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Top row: athlete name + status badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {deal.athlete_name}
            </h3>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-sm', statusColor)}>
              {getDealStatusLabel(deal.status)}
            </span>
          </div>

          {/* Staff */}
          {deal.staff_name && (
            <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <User size={12} strokeWidth={1.75} />
              <span>{deal.staff_name}</span>
            </div>
          )}

          {/* Package + price */}
          <div className="mt-1.5 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{deal.package_display_name || getServiceLabel(deal.package as Deal['package'])}</span>
            <span className="flex items-center gap-0.5">
              <DollarSign size={12} strokeWidth={1.75} />
              {formatCents(deal.price_cents)}
              {deal.billing_frequency && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {getBillingLabel(deal.billing_frequency)}
                </span>
              )}
            </span>
          </div>

          {/* Athlete details */}
          {(deal.athlete_level || deal.athlete_age || deal.skill_focus) && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {deal.athlete_level?.replace('_', ' ')}
              {deal.athlete_age ? `, ${deal.athlete_age}` : ''}
              {deal.skill_focus ? ` — ${deal.skill_focus}` : ''}
            </p>
          )}

          {/* AI confidence */}
          {deal.ai_confidence !== null && deal.ai_confidence !== undefined && (
            <div className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              AI confidence: {Math.round(deal.ai_confidence * 100)}%
            </div>
          )}

          {/* Meta row */}
          <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.75} />
              {formatRelativeTime(deal.created_at)}
            </span>
            {deal.athlete_phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} strokeWidth={1.75} />
                {formatPhoneNumber(deal.athlete_phone)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={16} strokeWidth={1.75} className="mt-1 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </button>
  )
}
