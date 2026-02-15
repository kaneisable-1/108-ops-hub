'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, Loader2, AlertCircle, TrendingUp, Users, Zap } from 'lucide-react'
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
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Loading state */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-sm text-gray-500">Loading analytics...</p>
          </div>
        )}

        {/* Error state */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-900">{error}</p>
            <button onClick={fetchDashboard} className="btn-secondary text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPICard
                label="Total Leads"
                value={data.funnel?.leads ?? 0}
                icon={<Users className="h-4 w-4 text-gray-900" />}
              />
              <KPICard
                label="Conversion"
                value={`${data.conversionRate?.rate ?? 0}%`}
                icon={<TrendingUp className="h-4 w-4 text-gray-700" />}
              />
              <KPICard
                label="At Risk"
                value={data.atRiskAthletes.length}
                icon={<AlertCircle className="h-4 w-4 text-gray-500" />}
              />
              <KPICard
                label="Sessions (30d)"
                value={data.coachPerformance.reduce((sum, c) => sum + c.sessions_count, 0)}
                icon={<Zap className="h-4 w-4 text-gray-400" />}
              />
            </div>

            {/* Pipeline funnel */}
            {data.funnel && <PipelineFunnel data={data.funnel} />}

            {/* Lead volume chart */}
            {data.leadVolume.length > 0 && <LeadVolumeChart data={data.leadVolume} />}

            {/* Queue distribution */}
            {data.queueDistribution.length > 0 && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">
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
                          <span className="text-sm text-gray-600 w-24 truncate capitalize">
                            {q.queue.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-16 text-right">
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
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">
                  Session Sentiment (30d)
                </h3>
                <div className="flex items-center gap-3">
                  {data.sentimentDistribution
                    .sort((a, b) => {
                      const order = { green: 0, yellow: 1, red: 2 }
                      return (order[a.sentiment as keyof typeof order] ?? 3) - (order[b.sentiment as keyof typeof order] ?? 3)
                    })
                    .map((s) => {
                      const colorMap: Record<string, string> = {
                        green: 'bg-gray-100 text-gray-700',
                        yellow: 'bg-gray-200 text-gray-600',
                        red: 'bg-gray-900 text-white',
                      }
                      return (
                        <span
                          key={s.sentiment}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium capitalize ${colorMap[s.sentiment] || 'bg-gray-100 text-gray-600'}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${
                            s.sentiment === 'green' ? 'bg-gray-400' :
                            s.sentiment === 'yellow' ? 'bg-gray-500' :
                            s.sentiment === 'red' ? 'bg-white' : 'bg-gray-400'
                          }`} />
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
          </>
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
        <span className="text-[11px] font-medium uppercase text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
