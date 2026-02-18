import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/analytics/dashboard
 *
 * Returns aggregated data for the Shadow Analytics Brain dashboard.
 * Sections: funnel, leadVolume, queueDistribution, coachPerformance,
 * atRiskAthletes, sentimentDistribution, conversionRate.
 *
 * Requires authenticated user. Uses service role for queries.
 */
export async function GET() {
  try {
    // Auth check — verify the caller is logged in
    const serverClient = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Calculate 6 months ago for lead volume
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString()

    // Run all queries in parallel for performance
    // Calculate 12 weeks ago for weekly trends
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      funnelResult,
      leadVolumeResult,
      queueDistResult,
      coachPerfResult,
      atRiskResult,
      sentimentResult,
      conversionResult,
      weeklyTrendResult,
      pipelineDistResult,
    ] = await Promise.allSettled([
      // 1. Pipeline funnel counts
      buildFunnelData(supabase),

      // 2. Monthly lead volume (last 6 months)
      buildLeadVolume(supabase, sixMonthsAgoStr),

      // 3. Queue distribution
      buildQueueDistribution(supabase),

      // 4. Coach performance (last 30 days)
      buildCoachPerformance(supabase, thirtyDaysAgo),

      // 5. At-risk athletes
      buildAtRiskAthletes(supabase),

      // 6. Sentiment distribution (last 30 days)
      buildSentimentDistribution(supabase, thirtyDaysAgo),

      // 7. Conversion rate (last 30 days)
      buildConversionRate(supabase, thirtyDaysAgo),

      // 8. Weekly conversion trend (last 12 weeks)
      buildWeeklyConversionTrend(supabase, twelveWeeksAgo),

      // 9. Pipeline stage distribution
      buildPipelineDistribution(supabase),
    ])

    return NextResponse.json({
      funnel: funnelResult.status === 'fulfilled' ? funnelResult.value : null,
      leadVolume: leadVolumeResult.status === 'fulfilled' ? leadVolumeResult.value : [],
      queueDistribution: queueDistResult.status === 'fulfilled' ? queueDistResult.value : [],
      coachPerformance: coachPerfResult.status === 'fulfilled' ? coachPerfResult.value : [],
      atRiskAthletes: atRiskResult.status === 'fulfilled' ? atRiskResult.value : [],
      sentimentDistribution: sentimentResult.status === 'fulfilled' ? sentimentResult.value : [],
      conversionRate: conversionResult.status === 'fulfilled' ? conversionResult.value : null,
      weeklyConversionTrend: weeklyTrendResult.status === 'fulfilled' ? weeklyTrendResult.value : [],
      pipelineDistribution: pipelineDistResult.status === 'fulfilled' ? pipelineDistResult.value : [],
    })
  } catch (err) {
    console.error('Analytics dashboard GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────
// Query builders
// ──────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>

async function buildFunnelData(supabase: SupabaseClient) {
  // Count total leads
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  // Count applications (leads that applied)
  const { count: appliedCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })

  // Count experiences with status 'booked' or beyond
  const { count: bookedCount } = await supabase
    .from('experiences')
    .select('*', { count: 'exact', head: true })

  // Count experiences where athlete arrived (status = arrived, in_progress, completed)
  const { count: arrivedCount } = await supabase
    .from('experiences')
    .select('*', { count: 'exact', head: true })
    .in('status', ['arrived', 'in_progress', 'completed'])

  // Count completed experiences
  const { count: completedCount } = await supabase
    .from('experiences')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  return {
    leads: leadsCount || 0,
    applied: appliedCount || 0,
    booked: bookedCount || 0,
    arrived: arrivedCount || 0,
    completed: completedCount || 0,
  }
}

async function buildLeadVolume(supabase: SupabaseClient, sinceDate: string) {
  // Fetch leads created in the last 6 months
  const { data: leads } = await supabase
    .from('leads')
    .select('created_at')
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: true })

  if (!leads || leads.length === 0) return []

  // Group by YYYY-MM
  const monthCounts = new Map<string, number>()

  for (const lead of leads) {
    const date = new Date(lead.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
  }

  // Convert to array sorted by month
  return Array.from(monthCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }))
}

async function buildQueueDistribution(supabase: SupabaseClient) {
  // Fetch all leads with their queue values
  const { data: leads } = await supabase
    .from('leads')
    .select('queue')
    .not('queue', 'is', null)

  if (!leads || leads.length === 0) return []

  // Count by queue
  const queueCounts = new Map<string, number>()
  for (const lead of leads) {
    const q = lead.queue || 'unknown'
    queueCounts.set(q, (queueCounts.get(q) || 0) + 1)
  }

  return Array.from(queueCounts.entries()).map(([queue, count]) => ({ queue, count }))
}

async function buildCoachPerformance(supabase: SupabaseClient, sinceDate: string) {
  // Fetch sessions in last 30 days
  const { data: sessions } = await supabase
    .from('sessions')
    .select('coach_id, coach_sentiment')
    .gte('date', sinceDate.split('T')[0])

  if (!sessions || sessions.length === 0) return []

  // Group by coach_id
  const coachStats = new Map<
    string,
    { sessions_count: number; green_count: number; yellow_count: number; red_count: number }
  >()

  for (const session of sessions) {
    if (!session.coach_id) continue
    const stats = coachStats.get(session.coach_id) || {
      sessions_count: 0,
      green_count: 0,
      yellow_count: 0,
      red_count: 0,
    }
    stats.sessions_count++
    if (session.coach_sentiment === 'green') stats.green_count++
    else if (session.coach_sentiment === 'yellow') stats.yellow_count++
    else if (session.coach_sentiment === 'red') stats.red_count++
    coachStats.set(session.coach_id, stats)
  }

  // Fetch coach names
  const coachIds = Array.from(coachStats.keys())
  const { data: coaches } = await supabase
    .from('users')
    .select('id, name')
    .in('id', coachIds)

  const coachNameMap = new Map(
    (coaches || []).map((c: { id: string; name: string }) => [c.id, c.name])
  )

  return Array.from(coachStats.entries())
    .map(([coachId, stats]) => ({
      coach_name: coachNameMap.get(coachId) || 'Unknown',
      sessions_count: stats.sessions_count,
      green_count: stats.green_count,
      yellow_count: stats.yellow_count,
      red_count: stats.red_count,
    }))
    .sort((a, b) => b.sessions_count - a.sessions_count)
}

async function buildAtRiskAthletes(supabase: SupabaseClient) {
  // Query athlete_metrics where churn_risk_score > 0.7
  const { data: metrics } = await supabase
    .from('athlete_metrics')
    .select('lead_id, churn_risk_score, engagement_band, sessions_last_30_days, last_computed_at')
    .gt('churn_risk_score', 0.7)
    .order('churn_risk_score', { ascending: false })
    .limit(20)

  if (!metrics || metrics.length === 0) return []

  // Fetch athlete names
  const leadIds = metrics.map((m) => m.lead_id)
  const { data: leads } = await supabase
    .from('leads')
    .select('id, athlete_name, contact_name')
    .in('id', leadIds)

  const leadNameMap = new Map(
    (leads || []).map(
      (l: { id: string; athlete_name: string | null; contact_name: string | null }) => [
        l.id,
        l.athlete_name || l.contact_name || 'Unknown',
      ]
    )
  )

  return metrics.map((m) => ({
    lead_id: m.lead_id,
    athlete_name: leadNameMap.get(m.lead_id) || 'Unknown',
    churn_risk_score: m.churn_risk_score,
    engagement_band: m.engagement_band,
    sessions_last_30_days: m.sessions_last_30_days,
    last_computed_at: m.last_computed_at,
  }))
}

async function buildSentimentDistribution(supabase: SupabaseClient, sinceDate: string) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('coach_sentiment')
    .gte('date', sinceDate.split('T')[0])
    .not('coach_sentiment', 'is', null)

  if (!sessions || sessions.length === 0) return []

  const sentimentCounts = new Map<string, number>()
  for (const session of sessions) {
    const s = session.coach_sentiment || 'unknown'
    sentimentCounts.set(s, (sentimentCounts.get(s) || 0) + 1)
  }

  return Array.from(sentimentCounts.entries()).map(([sentiment, count]) => ({
    sentiment,
    count,
  }))
}

async function buildConversionRate(supabase: SupabaseClient, sinceDate: string) {
  // Total leads created in last 30 days
  const { count: total } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sinceDate)

  // Leads created in last 30 days that reached 'converted' status
  const { count: converted } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sinceDate)
    .eq('status', 'converted')

  const totalNum = total || 0
  const convertedNum = converted || 0

  return {
    total: totalNum,
    converted: convertedNum,
    rate: totalNum > 0 ? Math.round((convertedNum / totalNum) * 10000) / 100 : 0,
  }
}

async function buildWeeklyConversionTrend(supabase: SupabaseClient, sinceDate: string) {
  // Fetch leads created in last 12 weeks with their status
  const { data: leads } = await supabase
    .from('leads')
    .select('created_at, status')
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: true })

  if (!leads || leads.length === 0) return []

  // Group by ISO week
  const weekData = new Map<string, { total: number; converted: number; booked: number }>()

  for (const lead of leads) {
    const date = new Date(lead.created_at)
    // Get Monday of the week
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

    const stats = weekData.get(weekKey) || { total: 0, converted: 0, booked: 0 }
    stats.total++
    if (lead.status === 'converted') stats.converted++
    weekData.set(weekKey, stats)
  }

  // Count booked experiences per week
  const { data: experiences } = await supabase
    .from('experiences')
    .select('created_at')
    .gte('created_at', sinceDate)

  if (experiences) {
    for (const exp of experiences) {
      const date = new Date(exp.created_at)
      const day = date.getDay()
      const monday = new Date(date)
      monday.setDate(date.getDate() - ((day + 6) % 7))
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

      const stats = weekData.get(weekKey)
      if (stats) stats.booked++
    }
  }

  return Array.from(weekData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, stats]) => ({
      week,
      leads: stats.total,
      converted: stats.converted,
      booked: stats.booked,
      conversionRate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0,
    }))
}

async function buildPipelineDistribution(supabase: SupabaseClient) {
  const { data: leads } = await supabase
    .from('leads')
    .select('pipeline_stage')

  if (!leads || leads.length === 0) return []

  const stageCounts = new Map<string, number>()
  for (const lead of leads) {
    const stage = lead.pipeline_stage || 'lead'
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1)
  }

  const stageOrder = ['lead', 'applied', 'accepted', 'booked', 'arrived', 'completed', 'converting', 'converted', 'nurture']

  return stageOrder
    .filter((s) => stageCounts.has(s))
    .map((stage) => ({
      stage,
      count: stageCounts.get(stage) || 0,
    }))
}
