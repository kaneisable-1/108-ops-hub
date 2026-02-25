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
    return { label: 'High', className: 'bg-red-100 text-red-700' }
  }
  if (score > 0.7) {
    return { label: 'Medium', className: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Low', className: 'bg-emerald-100 text-emerald-700' }
}

function engagementBadge(band: string): { className?: string; style?: Record<string, string> } {
  switch (band.toLowerCase()) {
    case 'high':
      return { className: 'bg-blue-100 text-blue-700' }
    case 'low':
      return { className: 'bg-orange-100 text-orange-700' }
    default:
      return { style: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } }
  }
}

export default function RiskFlagsTable({ athletes }: RiskFlagsTableProps) {
  return (
    <div className="card p-4">
      <h3 className="section-label mb-4">
        At-Risk Athletes
      </h3>

      {athletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 mb-3">
            <ShieldCheck size={24} strokeWidth={1.75} className="text-emerald-500" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No at-risk athletes detected</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-placeholder)' }}>All athletes are in good standing</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div
            className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-placeholder)' }}
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
            const engagement = engagementBadge(athlete.engagement_band)
            return (
              <div
                key={athlete.lead_id}
                className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 items-center rounded-lg px-3 py-2.5 transition-colors duration-200 ease-apple"
                style={{ ['--hover-bg' as string]: 'var(--bg-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {athlete.athlete_name}
                  </p>
                </div>

                <div>
                  <span
                    className={cn(
                      'badge tabular-nums',
                      risk.className
                    )}
                  >
                    {Math.round(athlete.churn_risk_score * 100)}%
                    <span className="text-[10px] opacity-75 ml-0.5">{risk.label}</span>
                  </span>
                </div>

                <div>
                  <span
                    className={cn(
                      'badge capitalize',
                      engagement.className || ''
                    )}
                    style={engagement.style}
                  >
                    {athlete.engagement_band}
                  </span>
                </div>

                <p className="text-sm text-center font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {athlete.sessions_last_30_days}
                </p>

                <p className="text-xs text-right truncate tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
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
