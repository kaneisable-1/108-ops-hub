import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { formatBriefingText, formatBriefingHtml, type BriefingData, type AthleteDossier } from '@/lib/briefings/format'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

/**
 * POST /api/briefings/generate
 *
 * For each coach with schedule today, builds structured dossier
 * and stores in daily_briefings table.
 *
 * Query param: ?date=YYYY-MM-DD (defaults to today)
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().split('T')[0]

    const supabase = await createServiceRoleClient()

    // 1. Fetch all slots for the target date from the view
    const { data: slots, error: slotsError } = await supabase
      .from('v_coach_daily_schedule')
      .select('*')
      .eq('date', targetDate)
      .neq('status', 'canceled')
      .order('time_block', { ascending: true })

    if (slotsError) {
      console.error('Failed to fetch schedule:', slotsError)
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({
        message: 'No scheduled sessions for this date',
        briefings_created: 0,
      })
    }

    // 2. Group slots by coach
    const coachSlots = new Map<string, ScheduleSlotEnriched[]>()
    for (const slot of slots as ScheduleSlotEnriched[]) {
      if (!slot.coach_id) continue
      const existing = coachSlots.get(slot.coach_id) || []
      existing.push(slot)
      coachSlots.set(slot.coach_id, existing)
    }

    // 3. Build athlete dossiers (past sessions, injury notes, metrics)
    const allLeadIds = [...new Set(slots.map((s: ScheduleSlotEnriched) => s.lead_id).filter(Boolean))]
    const dossiers: Record<string, AthleteDossier> = {}

    if (allLeadIds.length > 0) {
      // Fetch recent sessions (last 3 per athlete)
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('lead_id, key_observations, injury_notes, coach_sentiment, date')
        .in('lead_id', allLeadIds)
        .order('date', { ascending: false })
        .limit(allLeadIds.length * 3)

      // Fetch athlete metrics
      const { data: metrics } = await supabase
        .from('athlete_metrics')
        .select('lead_id, sessions_last_30_days, engagement_band')
        .in('lead_id', allLeadIds)

      const metricsMap = new Map(
        (metrics || []).map((m: { lead_id: string; sessions_last_30_days: number; engagement_band: string }) => [m.lead_id, m])
      )

      // Group sessions by lead
      const sessionsByLead = new Map<string, typeof recentSessions>()
      for (const s of recentSessions || []) {
        const existing = sessionsByLead.get(s.lead_id) || []
        if (existing.length < 3) existing.push(s)
        sessionsByLead.set(s.lead_id, existing)
      }

      for (const leadId of allLeadIds) {
        const sessions = sessionsByLead.get(leadId) || []
        const metric = metricsMap.get(leadId)
        const latestSentiment = sessions[0]?.coach_sentiment || null

        dossiers[leadId] = {
          recentSummaries: sessions
            .map((s: { key_observations?: string }) => s.key_observations)
            .filter(Boolean) as string[],
          injuryNotes: sessions
            .map((s: { injury_notes?: string }) => s.injury_notes)
            .filter(Boolean) as string[],
          sentiment: latestSentiment as AthleteDossier['sentiment'],
          sessionsLast30: metric?.sessions_last_30_days || 0,
          engagementBand: (metric?.engagement_band as AthleteDossier['engagementBand']) || null,
        }
      }
    }

    // 4. Generate briefing for each coach
    const briefings: { coachId: string; coachName: string; text: string; html: string }[] = []

    for (const [coachId, coachSlotList] of coachSlots) {
      const firstSlot = coachSlotList[0]
      const coachName = firstSlot.coach_name || 'Coach'
      const coachTier = (firstSlot.coach_tier_display || 'J1') as CoachTier

      // Filter dossiers to only athletes for this coach
      const coachLeadIds = new Set(coachSlotList.map((s) => s.lead_id).filter(Boolean))
      const coachDossiers: Record<string, AthleteDossier> = {}
      for (const leadId of coachLeadIds) {
        if (dossiers[leadId]) coachDossiers[leadId] = dossiers[leadId]
      }

      const briefingData: BriefingData = {
        coachName,
        coachTier,
        date: targetDate,
        morningSlots: coachSlotList.filter((s) => s.time_block === 'morning'),
        afternoonSlots: coachSlotList.filter((s) => s.time_block === 'afternoon'),
        dossiers: Object.keys(coachDossiers).length > 0 ? coachDossiers : undefined,
      }

      const text = formatBriefingText(briefingData)
      const html = formatBriefingHtml(briefingData)

      briefings.push({ coachId, coachName, text, html })

      // Store in daily_briefings
      const { error: insertError } = await supabase
        .from('daily_briefings')
        .upsert(
          {
            coach_id: coachId,
            date: targetDate,
            briefing_text: text,
            briefing_content: {
              morningCount: briefingData.morningSlots.length,
              afternoonCount: briefingData.afternoonSlots.length,
              totalAthletes: coachSlotList.length,
              hasExitEvals: coachSlotList.some((s) => s.is_final_day),
              html,
            },
          },
          { onConflict: 'coach_id,date' }
        )

      if (insertError) {
        console.error(`Failed to store briefing for ${coachName}:`, insertError)
      }
    }

    return NextResponse.json({
      message: `Generated ${briefings.length} briefings for ${targetDate}`,
      briefings_created: briefings.length,
      coaches: briefings.map((b) => b.coachName),
    })
  } catch (err) {
    console.error('Briefing generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
