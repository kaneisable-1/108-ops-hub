'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import ParsedNotesDisplay from '@/components/sessions/ParsedNotesDisplay'
import { createClient } from '@/lib/supabase/client'
import type {
  Lead,
  Experience,
  Session,
  AthleteMetrics,
  LeadActivity,
  PipelineStage,
} from '@/types'

interface AthleteData {
  lead: Lead
  experiences: Experience[]
  sessions: (Session & { coach_name?: string })[]
  metrics: AthleteMetrics | null
  activities: LeadActivity[]
}

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  applied: 'Applied',
  accepted: 'Accepted',
  booked: 'Booked',
  arrived: 'Arrived',
  completed: 'Completed',
  converting: 'Converting',
  converted: 'Converted',
  nurture: 'Nurture',
}

const PIPELINE_ORDER: PipelineStage[] = [
  'lead', 'applied', 'accepted', 'booked', 'arrived', 'completed', 'converting', 'converted',
]

export default function AthleteDetailPage() {
  return (
    <RoleGate allowedRoles={['sales', 'coordinator', 'manager', 'admin']}>
      <DashboardLayout>
        <AthleteDetailContent />
      </DashboardLayout>
    </RoleGate>
  )
}

function AthleteDetailContent() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  const [data, setData] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'activity'>('overview')
  const supabase = createClient()

  const fetchAthlete = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Parallel fetch all data
      const [leadRes, expRes, sessionRes, metricsRes, activityRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase.from('experiences').select('*').eq('lead_id', leadId).order('start_date', { ascending: false }),
        supabase
          .from('sessions')
          .select('*, coach:users!coach_id(name)')
          .eq('lead_id', leadId)
          .order('date', { ascending: false })
          .limit(50),
        supabase.from('athlete_metrics').select('*').eq('lead_id', leadId).maybeSingle(),
        supabase
          .from('lead_activity')
          .select('*, user:users(name)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (leadRes.error) throw leadRes.error

      const sessions = (sessionRes.data || []).map((s: Record<string, unknown>) => ({
        ...s,
        coach_name: (s.coach as { name: string } | null)?.name || undefined,
      }))

      const activities = (activityRes.data || []).map((a: Record<string, unknown>) => ({
        ...a,
        user_name: (a.user as { name: string } | null)?.name || undefined,
      }))

      setData({
        lead: leadRes.data as Lead,
        experiences: (expRes.data || []) as Experience[],
        sessions: sessions as (Session & { coach_name?: string })[],
        metrics: metricsRes.data as AthleteMetrics | null,
        activities: activities as LeadActivity[],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athlete')
    } finally {
      setLoading(false)
    }
  }, [leadId, supabase])

  useEffect(() => {
    fetchAthlete()
  }, [fetchAthlete])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertCircle className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-900">{error || 'Athlete not found'}</p>
        <button onClick={() => router.back()} className="btn-secondary text-xs">
          Go Back
        </button>
      </div>
    )
  }

  const { lead, experiences, sessions, metrics, activities } = data
  const athleteName = lead.athlete_name || lead.contact_name || 'Unknown'
  const pipelineIdx = PIPELINE_ORDER.indexOf(lead.pipeline_stage)

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">{athleteName}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {lead.athlete_age && <span>Age {lead.athlete_age}</span>}
              {lead.athlete_level && (
                <span className="capitalize">{lead.athlete_level.replace('_', ' ')}</span>
              )}
              {lead.athlete_position && <span>{lead.athlete_position}</span>}
            </div>
          </div>
          <span className={cn(
            'badge text-xs',
            lead.pipeline_stage === 'converted' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          )}>
            {PIPELINE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
          </span>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-0.5">
          {PIPELINE_ORDER.map((stage, idx) => (
            <div
              key={stage}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                idx <= pipelineIdx ? 'bg-brand-500' : 'bg-gray-100'
              )}
              title={PIPELINE_LABELS[stage]}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Lead</span>
          <span className="text-[10px] text-gray-400">Converted</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-3 bg-white border-b border-gray-100">
        <div className="flex gap-1">
          {([
            { key: 'overview', label: 'Overview', icon: <User className="h-3.5 w-3.5" /> },
            { key: 'sessions', label: `Sessions (${sessions.length})`, icon: <FileText className="h-3.5 w-3.5" /> },
            { key: 'activity', label: 'Activity', icon: <Activity className="h-3.5 w-3.5" /> },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <OverviewTab lead={lead} experiences={experiences} metrics={metrics} sessions={sessions} />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab sessions={sessions} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab activities={activities} />
        )}
      </div>
    </div>
  )
}

// ---- Overview Tab ----
function OverviewTab({
  lead,
  experiences,
  metrics,
  sessions,
}: {
  lead: Lead
  experiences: Experience[]
  metrics: AthleteMetrics | null
  sessions: (Session & { coach_name?: string })[]
}) {
  const greenCount = sessions.filter((s) => s.coach_sentiment === 'green').length
  const yellowCount = sessions.filter((s) => s.coach_sentiment === 'yellow').length
  const redCount = sessions.filter((s) => s.coach_sentiment === 'red').length
  const totalSentiment = greenCount + yellowCount + redCount

  return (
    <div className="space-y-4">
      {/* Contact & Profile */}
      <div className="card p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase text-gray-400">Contact Info</h3>
        <div className="space-y-2">
          {lead.contact_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="h-4 w-4 text-gray-400" />
              {lead.contact_name}
            </div>
          )}
          {lead.contact_phone && (
            <a href={`tel:${lead.contact_phone}`} className="flex items-center gap-2 text-sm text-brand-600">
              <Phone className="h-4 w-4" />
              {formatPhoneNumber(lead.contact_phone)}
            </a>
          )}
          {lead.contact_email && (
            <p className="text-sm text-gray-600 pl-6">{lead.contact_email}</p>
          )}
          {lead.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-gray-400" />
              {lead.location}
              {lead.distance_hours ? ` (${lead.distance_hours}h)` : ''}
            </div>
          )}
        </div>

        {/* Athletic profile */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {lead.athlete_velocity && (
              <span className="badge bg-brand-50 text-brand-700 text-xs">{lead.athlete_velocity}</span>
            )}
            {lead.athlete_school_team && (
              <span className="badge bg-gray-100 text-gray-700 text-xs">{lead.athlete_school_team}</span>
            )}
            {lead.service_match && (
              <span className="badge bg-gray-200 text-gray-700 text-xs capitalize">
                {lead.service_match.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-gray-400">
            <TrendingUp className="inline h-3 w-3 mr-1" />
            Engagement Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricItem
              label="Engagement"
              value={
                <span className={cn(
                  'badge text-xs capitalize',
                  metrics.engagement_band === 'hot' && 'bg-gray-900 text-white',
                  metrics.engagement_band === 'warm' && 'bg-gray-300 text-gray-800',
                  metrics.engagement_band === 'cold' && 'bg-gray-100 text-gray-600',
                )}>
                  {metrics.engagement_band}
                </span>
              }
            />
            <MetricItem label="Sessions (7d)" value={metrics.sessions_last_7_days} />
            <MetricItem label="Sessions (30d)" value={metrics.sessions_last_30_days} />
            <MetricItem label="Total Sessions" value={metrics.workouts_completed_lifetime} />
            {metrics.churn_risk_score != null && (
              <MetricItem
                label="Churn Risk"
                value={
                  <span className={cn(
                    'text-sm font-bold',
                    metrics.churn_risk_score > 70 ? 'text-gray-900' :
                    metrics.churn_risk_score > 40 ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {metrics.churn_risk_score}%
                  </span>
                }
              />
            )}
            {metrics.avg_sessions_per_month != null && (
              <MetricItem label="Avg/Month" value={metrics.avg_sessions_per_month.toFixed(1)} />
            )}
          </div>
        </div>
      )}

      {/* Sentiment Summary */}
      {totalSentiment > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-gray-400">Session Sentiment</h3>
          <div className="flex items-center gap-3">
            <SentimentBar label="Green" count={greenCount} total={totalSentiment} color="bg-gray-200" />
            <SentimentBar label="Yellow" count={yellowCount} total={totalSentiment} color="bg-gray-400" />
            <SentimentBar label="Red" count={redCount} total={totalSentiment} color="bg-gray-900" />
          </div>
        </div>
      )}

      {/* Experiences */}
      {experiences.length > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-gray-400">
            <Calendar className="inline h-3 w-3 mr-1" />
            Experiences ({experiences.length})
          </h3>
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2.5',
                  exp.status === 'completed' ? 'border-gray-200 bg-gray-50' : 'border-brand-200 bg-brand-50/50'
                )}
              >
                <div>
                  <p className="text-sm font-medium text-gray-700 capitalize">
                    {exp.skill_focus.replace('_', ' ')}
                    {exp.duration_days ? ` (${exp.duration_days} days)` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(exp.start_date + 'T00:00:00'), 'MMM d')} —{' '}
                    {format(new Date(exp.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'badge text-[10px]',
                    exp.status === 'completed' && 'bg-gray-100 text-gray-600',
                    exp.status === 'booked' && 'bg-gray-200 text-gray-700',
                    exp.status === 'in_progress' && 'bg-gray-900 text-white',
                    exp.status === 'arrived' && 'bg-gray-700 text-white',
                    exp.status === 'canceled' && 'bg-gray-100 text-gray-400',
                  )}>
                    {exp.status.replace('_', ' ')}
                  </span>
                  {exp.payment_status && (
                    <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{exp.payment_status.replace('_', ' ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Sessions Tab ----
function SessionsTab({ sessions }: { sessions: (Session & { coach_name?: string })[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No sessions recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionHistoryCard key={session.id} session={session} />
      ))}
    </div>
  )
}

function SessionHistoryCard({ session }: { session: Session & { coach_name?: string } }) {
  const [expanded, setExpanded] = useState(false)

  const sentimentBadge: Record<string, { bg: string; label: string }> = {
    green: { bg: 'bg-gray-100 text-gray-700', label: 'Green' },
    yellow: { bg: 'bg-gray-300 text-gray-800', label: 'Yellow' },
    red: { bg: 'bg-gray-900 text-white', label: 'Red' },
  }

  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {format(new Date(session.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {session.coach_name || 'Unknown Coach'} &middot; {session.skill}
              {session.duration_minutes ? ` &middot; ${session.duration_minutes}min` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sentiment && <span className={cn('badge text-xs', sentiment.bg)}>{sentiment.label}</span>}
            {session.is_exit_eval && <span className="badge bg-gray-200 text-gray-700 text-xs">Exit</span>}
          </div>
        </div>
        {session.raw_notes && !expanded && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{session.raw_notes}</p>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {session.sentiment_reason && (
            <p className="text-xs text-gray-600">{session.sentiment_reason}</p>
          )}

          {session.raw_notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.raw_notes}</p>
            </div>
          )}

          {session.parsed_notes && session.ai_parsed_at && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">AI-Parsed</h4>
              <ParsedNotesDisplay parsed={session.parsed_notes} />
            </div>
          )}

          {session.drills_performed && session.drills_performed.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Drills</h4>
              <div className="flex flex-wrap gap-1">
                {session.drills_performed.map((d, i) => (
                  <span key={i} className="badge bg-gray-100 text-gray-700 text-xs">{d}</span>
                ))}
              </div>
            </div>
          )}

          {session.athlete_effort_rating && (
            <p className="text-xs text-gray-600">Effort: {session.athlete_effort_rating}/5</p>
          )}

          {session.injury_notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Injury Notes</h4>
              <p className="text-xs text-gray-900 font-medium">{session.injury_notes}</p>
            </div>
          )}

          {session.is_exit_eval && session.exit_eval && (() => {
            const evalData = session.exit_eval as Record<string, unknown>
            return (
              <div className="rounded-xl bg-gray-50 p-3 mt-2">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Exit Evaluation</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {evalData.progress_rating != null && (
                    <div><span className="text-gray-400">Progress:</span> {String(evalData.progress_rating)}/5</div>
                  )}
                  {evalData.recommendation != null && (
                    <div><span className="text-gray-400">Rec:</span> {String(evalData.recommendation)}</div>
                  )}
                  {evalData.would_work_again != null && (
                    <div><span className="text-gray-400">Again:</span> {String(evalData.would_work_again)}</div>
                  )}
                </div>
                {evalData.final_notes != null && (
                  <p className="text-xs text-gray-600 mt-2">{String(evalData.final_notes)}</p>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ---- Activity Tab ----
function ActivityTab({ activities }: { activities: LeadActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, idx) => (
        <div key={activity.id} className="flex gap-3">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-gray-300 mt-1.5" />
            {idx < activities.length - 1 && (
              <div className="w-px flex-1 bg-gray-200" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0 flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{activity.action.replace(/_/g, ' ')}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {activity.user_name || 'System'} &middot;{' '}
              {format(new Date(activity.created_at), 'MMM d, h:mm a')}
            </p>
            {activity.details && Object.keys(activity.details).length > 0 && (
              <div className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                {Object.entries(activity.details).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-gray-400">{key}:</span> {String(val)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Shared Components ----
function MetricItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase">{label}</p>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  )
}

function SentimentBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
