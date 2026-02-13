import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { formatBriefingText, formatBriefingHtml, type BriefingData } from '@/lib/briefings/format'
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

    // 3. Generate briefing for each coach
    const briefings: { coachId: string; coachName: string; text: string; html: string }[] = []

    for (const [coachId, coachSlotList] of coachSlots) {
      const firstSlot = coachSlotList[0]
      const coachName = firstSlot.coach_name || 'Coach'
      const coachTier = (firstSlot.coach_tier_display || 'J1') as CoachTier

      const briefingData: BriefingData = {
        coachName,
        coachTier,
        date: targetDate,
        morningSlots: coachSlotList.filter((s) => s.time_block === 'morning'),
        afternoonSlots: coachSlotList.filter((s) => s.time_block === 'afternoon'),
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
