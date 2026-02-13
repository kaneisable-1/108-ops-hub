import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  suggestAssignments,
  type CoachInfo,
  type ExistingSlot,
  type AvailabilityDay,
  type CoachLoad,
  type ExperienceInput,
} from '@/lib/scheduling'
import type { AthleteLevel, CoachTier, TimeBlock } from '@/types'

/**
 * POST /api/schedule/suggest
 *
 * Takes an experience_id, fetches all required data, runs the
 * scheduling algorithm, and returns suggested coach assignments.
 */
export async function POST(request: NextRequest) {
  try {
    const { experience_id } = await request.json()

    if (!experience_id) {
      return NextResponse.json(
        { error: 'experience_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // 1. Fetch the experience with lead data
    const { data: experience, error: expError } = await supabase
      .from('experiences')
      .select(`
        *,
        lead:leads!lead_id(
          athlete_name,
          athlete_level,
          athlete_age
        )
      `)
      .eq('id', experience_id)
      .single()

    if (expError || !experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      )
    }

    const lead = experience.lead as Record<string, unknown> | null

    // 2. Generate date range from start to end
    const dates = generateDateRange(experience.start_date, experience.end_date)

    // 3. Build experience input
    const experienceInput: ExperienceInput = {
      athleteLevel: (lead?.athlete_level as AthleteLevel) || null,
      athleteAge: (lead?.athlete_age as number) || null,
      skillFocus: experience.skill_focus,
      dates,
    }

    // 4. Fetch all coaches
    const { data: coachRows } = await supabase
      .from('users')
      .select('id, name, coach_tier, disciplines')
      .eq('is_coach', true)

    const coaches: CoachInfo[] = (coachRows || []).map((c) => ({
      id: c.id,
      name: c.name,
      tier: c.coach_tier as CoachTier,
      disciplines: c.disciplines || [],
    }))

    // 5. Fetch existing slots in the date range
    const { data: slotRows } = await supabase
      .from('schedule_slots')
      .select('coach_id, date, time_block, lead_id')
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1])
      .neq('status', 'canceled')

    // Aggregate existing slots by coach+date+block
    const slotMap = new Map<string, { count: number; levels: (AthleteLevel | null)[]; hasPro: boolean }>()
    if (slotRows) {
      for (const row of slotRows) {
        const key = `${row.coach_id}|${row.date}|${row.time_block}`
        const existing = slotMap.get(key) || { count: 0, levels: [], hasPro: false }
        existing.count++
        // We'd need lead data for levels — for now mark as null
        slotMap.set(key, existing)
      }
    }

    const existingSlots: ExistingSlot[] = Array.from(slotMap.entries()).map(
      ([key, val]) => {
        const [coachId, date, timeBlock] = key.split('|')
        return {
          coachId,
          date,
          timeBlock: timeBlock as TimeBlock,
          athleteLevel: val.levels[0] || null,
          athleteCount: val.count,
          isPro: val.hasPro,
        }
      }
    )

    // 6. Fetch coach availability for date range
    const { data: availRows } = await supabase
      .from('coach_availability')
      .select('coach_id, date, available')
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1])

    const coachAvailability: AvailabilityDay[] = (availRows || []).map((a) => ({
      coachId: a.coach_id,
      date: a.date,
      available: a.available,
    }))

    // 7. Compute coach loads (total slots today across all dates)
    const coachLoads: CoachLoad[] = coaches.map((c) => {
      const totalSlots = (slotRows || []).filter(
        (s) => s.coach_id === c.id
      ).length
      return { coachId: c.id, slotsToday: totalSlots }
    })

    // 8. Run the algorithm
    const suggestions = suggestAssignments(experienceInput, {
      coaches,
      existingSlots,
      coachAvailability,
      coachLoads,
    })

    // 9. Gather warnings
    const warnings: string[] = []
    for (const day of suggestions) {
      for (const block of day.blocks) {
        if (block.conflict) {
          warnings.push(block.conflict)
        }
      }
    }

    return NextResponse.json({
      suggestions,
      warnings,
      experience_id,
    })
  } catch (err) {
    console.error('Schedule suggest error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate array of YYYY-MM-DD strings between start and end (inclusive)
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}
