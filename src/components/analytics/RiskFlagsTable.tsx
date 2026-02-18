'use client'

import { ShieldCheck } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

interface RiskFlagsTableProps {
  athletes: Array<{
    lead_id: string
    athlete_name: string
    churn_risk_score: number
    engagement_band: string
    sessions_last_30_days: number
    last_computed_at: string
  }>
}

function riskBadge(score: number): { label: string; className: string } {
  if (score > 0.85) {
    return { label: 'High', className: 'bg-red-500/15 text-red-400' }
  }
  if (score > 0.7) {
    return { label: 'Medium', className: 'bg-amber-500/15 text-amber-400' }
  }
  return { label: 'Low', className: 'bg-emerald-500/15 text-emerald-400' }
}

function engagementBadge(band: string): string {
  switch (band.toLowerCase()) {
    case 'high':
      return 'bg-blue-500/15 text-blue-400'
    case 'medium':
      return 'bg-gray-500/15 text-gray-400'
    case 'low':
      return 'bg-orange-500/15 text-orange-400'
    default:
      return 'bg-gray-500/15 text-gray-400'
  }
}

export default function RiskFlagsTable({ athletes }: RiskFlagsTableProps) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">At-Risk Athletes</h3>

      {athletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No at-risk athletes detected</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div
            className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 px-3 py-2 text-[11px] font-semibold uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Athlete</span>
            <span>Risk</span>
            <span>Engagement</span>
            <span className="text-center">Sessions</span>
            <span className="text-right">Updated</span>
          </div>

          {/* Data rows */}
          {athletes.map((athlete) => {
            const risk = riskBadge(athlete.churn_risk_score)
            return (
              <div
                key={athlete.lead_id}
                className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 items-center rounded-lg px-3 py-2.5 transition-colors"
                style={{ cursor: 'default' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-card-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {athlete.athlete_name}
                  </p>
                </div>

                <div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      risk.className
                    )}
                  >
                    {Math.round(athlete.churn_risk_score * 100)}%
                    <span className="text-[10px] opacity-75">{risk.label}</span>
                  </span>
                </div>

                <div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      engagementBadge(athlete.engagement_band)
                    )}
                  >
                    {athlete.engagement_band}
                  </span>
                </div>

                <p className="text-sm text-center font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {athlete.sessions_last_30_days}
                </p>

                <p className="text-xs text-right truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {formatRelativeTime(athlete.last_computed_at)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
