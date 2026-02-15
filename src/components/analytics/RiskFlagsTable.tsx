'use client'

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
    return { label: 'High', className: 'bg-gray-900 text-white' }
  }
  if (score > 0.7) {
    return { label: 'Medium', className: 'bg-gray-300 text-gray-800' }
  }
  return { label: 'Low', className: 'bg-gray-100 text-gray-600' }
}

function engagementBadge(band: string): string {
  switch (band.toLowerCase()) {
    case 'high':
      return 'bg-gray-200 text-gray-700'
    case 'medium':
      return 'bg-gray-100 text-gray-600'
    case 'low':
      return 'bg-gray-400 text-white'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export default function RiskFlagsTable({ athletes }: RiskFlagsTableProps) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase text-gray-400 mb-4">
        At-Risk Athletes
      </h3>

      {athletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No at-risk athletes detected</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 px-3 py-2 text-[11px] font-semibold uppercase text-gray-400">
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
                className="grid grid-cols-[1fr_80px_90px_60px_100px] gap-2 items-center rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
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

                <p className="text-sm text-gray-700 text-center font-medium">
                  {athlete.sessions_last_30_days}
                </p>

                <p className="text-xs text-gray-400 text-right truncate">
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
