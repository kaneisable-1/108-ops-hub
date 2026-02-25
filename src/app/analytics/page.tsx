'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, Loader2, AlertCircle, TrendingUp, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import PipelineFunnel from '@/components/analytics/PipelineFunnel'
import LeadVolumeChart from '@/components/analytics/LeadVolumeChart'
import CoachPerformanceChart from '@/components/analytics/CoachPerformanceChart'
import RiskFlagsTable from '@/components/analytics/RiskFlagsTable'

interface DashboardData {
  funnel: {
    leads: number
    applied: number
    booked: number
    arrived: number
    completed: number
  } | null
  leadVolume: Array<{ month: string; count: number }>
  queueDistribution: Array<{ queue: string; count: number }>
  coachPerformance: Array<{
    coach_name: string
    sessions_count: number
    green_count: number
    yellow_count: number
    red_count: number
  }>
  atRiskAthletes: Array<{
    lead_id: string
    athlete_name: string
    churn_risk_score: number
    engagement_band: string
    sessions_last_30_days: number
    last_computed_at: string
  }>
  sentimentDistribution: Array<{ sentiment: string; count: number }>
  conversionRate: { total: number; converted: number; rate: number } | null
}

export default function AnalyticsPage() {
  return (
    <RoleGate allowedRoles={['admin']}>
      <DashboardLayout>
        <AnalyticsContent />
      </DashboardLayout>
    </RoleGate>
  )
}

function AnalyticsContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics/dashboard')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to fetch analytics')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={20} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
            </div>
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 ease-apple cursor-pointer disabled:opacity-50"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <RefreshCw size={14} strokeWidth={1.75} className={cn(loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="content-area py-6 space-y-4">
        {/* Loading state */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading analytics...</p>
          </div>
        )}

        {/* Error state */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
            >
              <AlertCircle size={24} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button
              onClick={fetchDashboard}
              className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} strokeWidth={1.75} />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <div className="space-y-4 animate-fade-in" style={{ maxWidth: '720px' }}>
            {/* KPI cards */}
            <div className="stat-grid">
              <KPICard
                label="Total Leads"
                value={data.funnel?.leads ?? 0}
                icon={<Users size={16} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />}
              />
              <KPICard
                label="Conversion"
                value={`${data.conversionRate?.rate ?? 0}%`}
                icon={<TrendingUp size={16} strokeWidth={1.75} className="text-emerald-500" />}
              />
              <KPICard
                label="At Risk"
                value={data.atRiskAthletes.length}
                icon={<AlertCircle size={16} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />}
              />
              <KPICard
                label="Sessions (30d)"
                value={data.coachPerformance.reduce((sum, c) => sum + c.sessions_count, 0)}
                icon={<Zap size={16} strokeWidth={1.75} style={{ color: 'var(--color-warning)' }} />}
              />
            </div>

            {/* Pipeline funnel */}
            {data.funnel && <PipelineFunnel data={data.funnel} />}

            {/* Lead volume chart */}
            {data.leadVolume.length > 0 && <LeadVolumeChart data={data.leadVolume} />}

            {/* Queue distribution */}
            {data.queueDistribution.length > 0 && (
              <div className="card p-4">
                <h3 className="section-label mb-3">
                  Queue Distribution
                </h3>
                <div className="space-y-2">
                  {data.queueDistribution
                    .sort((a, b) => b.count - a.count)
                    .map((q) => {
                      const total = data.queueDistribution.reduce((s, x) => s + x.count, 0)
                      const pct = total > 0 ? Math.round((q.count / total) * 100) : 0
                      return (
                        <div key={q.queue} className="flex items-center gap-3">
                          <span
                            className="text-sm w-24 truncate capitalize"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {q.queue.replace(/_/g, ' ')}
                          </span>
                          <div
                            className="flex-1 h-6 rounded-full overflow-hidden"
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: 'var(--accent-blue)' }}
                            />
                          </div>
                          <span
                            className="text-xs font-medium w-16 text-right tabular-nums"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {q.count} ({pct}%)
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Sentiment overview */}
            {data.sentimentDistribution.length > 0 && (
              <div className="card p-4">
                <h3 className="section-label mb-3">
                  Session Sentiment (30d)
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {data.sentimentDistribution
                    .sort((a, b) => {
                      const order = { green: 0, yellow: 1, red: 2 }
                      return (order[a.sentiment as keyof typeof order] ?? 3) - (order[b.sentiment as keyof typeof order] ?? 3)
                    })
                    .map((s) => {
                      const colorMap: Record<string, string> = {
                        green: 'bg-emerald-100 text-emerald-700',
                        yellow: 'bg-amber-100 text-amber-700',
                        red: 'bg-red-100 text-red-700',
                      }
                      const dotMap: Record<string, string> = {
                        green: 'bg-emerald-500',
                        yellow: 'bg-amber-500',
                        red: 'bg-red-500',
                      }
                      return (
                        <span
                          key={s.sentiment}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium capitalize tabular-nums',
                            colorMap[s.sentiment] || ''
                          )}
                          style={!colorMap[s.sentiment] ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
                        >
                          <span className={cn(
                            'h-2 w-2 rounded-full',
                            dotMap[s.sentiment] || ''
                          )} style={!dotMap[s.sentiment] ? { background: 'var(--text-placeholder)' } : undefined} />
                          {s.sentiment}: {s.count}
                        </span>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Coach performance */}
            {data.coachPerformance.length > 0 && (
              <CoachPerformanceChart data={data.coachPerformance} />
            )}

            {/* At-risk athletes */}
            <RiskFlagsTable athletes={data.atRiskAthletes} />
          </div>
        )}
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-placeholder)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
