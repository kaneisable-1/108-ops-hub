'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, AlertCircle, TrendingUp, TrendingDown, Users, Zap, Target, ShieldAlert } from 'lucide-react'
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4" style={{ background: 'var(--surface-primary)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
              <Target className="h-4 w-4 text-brand-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Operations</h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>108 Performance Analytics</p>
            </div>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Loading state */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading analytics...</p>
          </div>
        )}

        {/* Error state */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={fetchDashboard} className="btn-secondary text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <>
            {/* KPI Row — Top stat cards like Operations dashboard */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Leads"
                value={data.funnel?.leads ?? 0}
                icon={<Users className="h-4 w-4" />}
                iconColor="text-brand-400"
                iconBg="bg-brand-500/10"
              />
              <StatCard
                label="Conversion Rate"
                value={`${data.conversionRate?.rate ?? 0}%`}
                sub={`${data.conversionRate?.converted ?? 0} of ${data.conversionRate?.total ?? 0}`}
                icon={<TrendingUp className="h-4 w-4" />}
                iconColor="text-emerald-400"
                iconBg="bg-emerald-500/10"
                trend={data.conversionRate?.rate && data.conversionRate.rate > 10 ? 'up' : undefined}
                trendValue={data.conversionRate?.rate ? `${data.conversionRate.rate}%` : undefined}
              />
              <StatCard
                label="At Risk"
                value={data.atRiskAthletes.length}
                icon={<ShieldAlert className="h-4 w-4" />}
                iconColor="text-red-400"
                iconBg="bg-red-500/10"
                trend={data.atRiskAthletes.length > 3 ? 'down' : undefined}
                trendValue={data.atRiskAthletes.length > 0 ? `${data.atRiskAthletes.length} flagged` : undefined}
              />
              <StatCard
                label="Sessions (30d)"
                value={data.coachPerformance.reduce((sum, c) => sum + c.sessions_count, 0)}
                icon={<Zap className="h-4 w-4" />}
                iconColor="text-amber-400"
                iconBg="bg-amber-500/10"
              />
            </div>

            {/* Main charts grid — 2-column layout like Operations dashboard */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Pipeline funnel */}
              {data.funnel && <PipelineFunnel data={data.funnel} />}

              {/* Lead volume chart */}
              {data.leadVolume.length > 0 && <LeadVolumeChart data={data.leadVolume} />}
            </div>

            {/* Secondary row — Queue + Sentiment side by side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Queue distribution */}
              {data.queueDistribution.length > 0 && (
                <div className="chart-card lg:col-span-2">
                  <h3 className="chart-title">Queue Distribution</h3>
                  <div className="space-y-3">
                    {data.queueDistribution
                      .sort((a, b) => b.count - a.count)
                      .map((q) => {
                        const total = data.queueDistribution.reduce((s, x) => s + x.count, 0)
                        const pct = total > 0 ? Math.round((q.count / total) * 100) : 0
                        return (
                          <div key={q.queue} className="flex items-center gap-3">
                            <span className="text-sm w-28 truncate capitalize" style={{ color: 'var(--text-secondary)' }}>
                              {q.queue.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
                              <div
                                className="h-full rounded-lg transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg, #F97316 0%, #FB923C ${pct}%)`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium w-20 text-right" style={{ color: 'var(--text-secondary)' }}>
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
                <div className="chart-card">
                  <h3 className="chart-title">Session Sentiment</h3>
                  <div className="space-y-4 mt-2">
                    {data.sentimentDistribution
                      .sort((a, b) => {
                        const order = { green: 0, yellow: 1, red: 2 }
                        return (order[a.sentiment as keyof typeof order] ?? 3) - (order[b.sentiment as keyof typeof order] ?? 3)
                      })
                      .map((s) => {
                        const total = data.sentimentDistribution.reduce((sum, x) => sum + x.count, 0)
                        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                        const colorMap: Record<string, { bar: string; text: string; dot: string }> = {
                          green: { bar: '#22C55E', text: 'text-emerald-400', dot: 'bg-emerald-400' },
                          yellow: { bar: '#F59E0B', text: 'text-amber-400', dot: 'bg-amber-400' },
                          red: { bar: '#EF4444', text: 'text-red-400', dot: 'bg-red-400' },
                        }
                        const colors = colorMap[s.sentiment] || { bar: '#6B7280', text: 'text-gray-400', dot: 'bg-gray-400' }
                        return (
                          <div key={s.sentiment}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                                <span className={`text-sm font-medium capitalize ${colors.text}`}>{s.sentiment}</span>
                              </div>
                              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {s.count}
                              </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: colors.bar }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Coach performance — full width */}
            {data.coachPerformance.length > 0 && (
              <CoachPerformanceChart data={data.coachPerformance} />
            )}

            {/* At-risk athletes — full width */}
            <RiskFlagsTable athletes={data.atRiskAthletes} />
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  iconColor,
  iconBg,
  trend,
  trendValue,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  trend?: 'up' | 'down'
  trendValue?: string
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="stat-sub">{sub}</p>}
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={trend === 'up' ? 'stat-trend-up' : 'stat-trend-down'}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  )
}
