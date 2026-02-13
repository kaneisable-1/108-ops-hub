import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/metrics/compute
 *
 * Metric engine that computes athlete_metrics for all leads with sessions.
 * Designed to be called by n8n cron or manually by an admin.
 *
 * Authorization: either x-cron-secret header matching CRON_SECRET env var,
 * or an authenticated admin user.
 *
 * Returns: { computed: number, at_risk: number }
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authorization ──────────────────────────────
    const cronSecret = request.headers.get('x-cron-secret')
    let authorized = false

    // Check cron secret first
    if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
      authorized = true
    }

    // If no cron secret, check for authenticated admin
    if (!authorized) {
      try {
        const serverClient = await createServerSupabaseClient()
        const {
          data: { user },
        } = await serverClient.auth.getUser()

        if (user) {
          const supabaseCheck = await createServiceRoleClient()
          const { data: userRecord } = await supabaseCheck
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

          if (userRecord?.role === 'admin') {
            authorized = true
          }
        }
      } catch {
        // Auth check failed — will fall through to unauthorized
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Compute metrics ────────────────────────────
    const supabase = await createServiceRoleClient()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all sessions grouped by lead_id
    const { data: allSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('lead_id, date')
      .order('date', { ascending: true })

    if (sessionsError) {
      console.error('Failed to fetch sessions for metrics:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    if (!allSessions || allSessions.length === 0) {
      return NextResponse.json({ computed: 0, at_risk: 0 })
    }

    // Group sessions by lead_id
    const sessionsByLead = new Map<string, { date: string }[]>()
    for (const session of allSessions) {
      if (!session.lead_id) continue
      const existing = sessionsByLead.get(session.lead_id) || []
      existing.push({ date: session.date })
      sessionsByLead.set(session.lead_id, existing)
    }

    let computed = 0
    let atRisk = 0
    const upsertBatch: MetricsRow[] = []

    for (const [leadId, sessions] of sessionsByLead) {
      // Sort sessions by date ascending
      const sorted = sessions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const firstSessionDate = new Date(sorted[0].date)
      const lastSessionDate = new Date(sorted[sorted.length - 1].date)

      // Count sessions in time windows
      const sessionsLast7 = sorted.filter(
        (s) => new Date(s.date).getTime() >= sevenDaysAgo.getTime()
      ).length

      const sessionsLast30 = sorted.filter(
        (s) => new Date(s.date).getTime() >= thirtyDaysAgo.getTime()
      ).length

      // Average sessions per month
      const monthsSinceFirst = Math.max(
        1,
        (now.getTime() - firstSessionDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      )
      const avgSessionsPerMonth = Math.round((sorted.length / monthsSinceFirst) * 100) / 100

      // Engagement band
      let engagementBand: 'hot' | 'warm' | 'cold'
      if (sessionsLast30 >= 8) {
        engagementBand = 'hot'
      } else if (sessionsLast30 >= 3) {
        engagementBand = 'warm'
      } else {
        engagementBand = 'cold'
      }

      // Churn risk score (0 to 1)
      const churnRiskScore = computeChurnRisk(
        lastSessionDate,
        now,
        sessionsLast30,
        sessionsLast7,
        avgSessionsPerMonth,
        engagementBand
      )

      if (churnRiskScore > 0.7) {
        atRisk++
      }

      upsertBatch.push({
        lead_id: leadId,
        sessions_last_7_days: sessionsLast7,
        sessions_last_30_days: sessionsLast30,
        workouts_completed_lifetime: sorted.length,
        avg_sessions_per_month: avgSessionsPerMonth,
        engagement_band: engagementBand,
        churn_risk_score: Math.round(churnRiskScore * 1000) / 1000,
        last_computed_at: now.toISOString(),
      })

      computed++
    }

    // Upsert in batches of 50
    const batchSize = 50
    for (let i = 0; i < upsertBatch.length; i += batchSize) {
      const batch = upsertBatch.slice(i, i + batchSize)
      const { error: upsertError } = await supabase
        .from('athlete_metrics')
        .upsert(batch, { onConflict: 'lead_id' })

      if (upsertError) {
        console.error(`Metrics upsert error (batch ${i / batchSize}):`, upsertError)
        // Continue with other batches rather than failing entirely
      }
    }

    return NextResponse.json({ computed, at_risk: atRisk })
  } catch (err) {
    console.error('Metrics compute error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────
// Churn risk computation
// ──────────────────────────────────────────────

interface MetricsRow {
  lead_id: string
  sessions_last_7_days: number
  sessions_last_30_days: number
  workouts_completed_lifetime: number
  avg_sessions_per_month: number
  engagement_band: 'hot' | 'warm' | 'cold'
  churn_risk_score: number
  last_computed_at: string
}

/**
 * Compute churn risk score from 0 (low risk) to 1 (high risk).
 *
 * Factors:
 * - Days since last session: the longer the gap, the higher the risk
 * - Declining frequency: if recent sessions are fewer than average
 * - Engagement band: cold = higher base risk
 */
function computeChurnRisk(
  lastSessionDate: Date,
  now: Date,
  sessionsLast30: number,
  sessionsLast7: number,
  avgPerMonth: number,
  engagementBand: 'hot' | 'warm' | 'cold'
): number {
  // Factor 1: Days since last session (0 to 0.5)
  // 0 days = 0 risk, 14+ days = 0.5 risk (capped)
  const daysSinceLast = (now.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)
  const recencyRisk = Math.min(daysSinceLast / 28, 0.5)

  // Factor 2: Frequency decline (0 to 0.3)
  // Compare current 30-day rate to historical average
  let declineRisk = 0
  if (avgPerMonth > 0) {
    const currentMonthlyRate = sessionsLast30
    const ratio = currentMonthlyRate / avgPerMonth
    if (ratio < 0.5) {
      declineRisk = 0.3
    } else if (ratio < 0.75) {
      declineRisk = 0.15
    }
  }

  // Factor 3: Engagement band (0 to 0.2)
  let engagementRisk = 0
  if (engagementBand === 'cold') {
    engagementRisk = 0.2
  } else if (engagementBand === 'warm') {
    engagementRisk = 0.05
  }

  // Factor 4: Recent week activity bonus (reduces risk)
  // If they've been active in the last 7 days, reduce overall risk
  const recentBonus = sessionsLast7 > 0 ? -0.1 : 0

  const total = recencyRisk + declineRisk + engagementRisk + recentBonus
  return Math.max(0, Math.min(1, total))
}
