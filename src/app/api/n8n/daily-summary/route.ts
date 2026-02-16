import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateServiceKey } from '@/lib/auth/serviceKey'
import { sendDiscord } from '@/lib/notifications'

/**
 * POST /api/n8n/daily-summary
 *
 * Aggregates today's stats and sends a summary to Discord.
 * Stats: new leads, calls logged, conversions, sessions completed, at-risk count.
 *
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY | CRON_SECRET>
 */
export async function POST(request: Request) {
  const authError = validateServiceKey(request)
  if (authError) return authError

  try {
    const today = new Date().toISOString().split('T')[0]
    const supabase = await createServiceRoleClient()

    // Run all stat queries in parallel
    const [
      newLeadsResult,
      callsResult,
      conversionsResult,
      sessionsResult,
      atRiskResult,
    ] = await Promise.all([
      // New leads today
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`),

      // Calls logged today
      supabase
        .from('lead_activity')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'call_logged')
        .gte('created_at', `${today}T00:00:00`),

      // Conversions today (pipeline_stage_changed to 'converted')
      supabase
        .from('lead_activity')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'pipeline_stage_changed')
        .gte('created_at', `${today}T00:00:00`)
        .contains('details', { to: 'converted' }),

      // Sessions completed today
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('date', today),

      // At-risk athletes (red sentiment in last 7 days)
      supabase
        .from('sessions')
        .select('lead_id', { count: 'exact', head: true })
        .eq('coach_sentiment', 'red')
        .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
    ])

    const stats = {
      new_leads: newLeadsResult.count || 0,
      calls_logged: callsResult.count || 0,
      conversions: conversionsResult.count || 0,
      sessions: sessionsResult.count || 0,
      at_risk: atRiskResult.count || 0,
    }

    // Send Discord summary
    await sendDiscord({
      content: `\u{1F4CA} **Daily Summary — ${today}**`,
      embeds: [{
        color: 0x6366f1,
        fields: [
          { name: 'New Leads', value: String(stats.new_leads), inline: true },
          { name: 'Calls Logged', value: String(stats.calls_logged), inline: true },
          { name: 'Conversions', value: String(stats.conversions), inline: true },
          { name: 'Sessions', value: String(stats.sessions), inline: true },
          { name: 'At-Risk (7d)', value: String(stats.at_risk), inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
      recipientLabel: 'daily-summary',
    })

    return NextResponse.json({ success: true, date: today, stats })
  } catch (err) {
    console.error('[n8n/daily-summary] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
