import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateAssignment, type SlotToValidate, type ExistingContext } from '@/lib/scheduling'
import type { CoachTier, TimeBlock, ValidationResult } from '@/types'

interface AssignmentPayload {
  schedule_slot_id: string
  coach_id: string
}

/**
 * POST /api/schedule/assign
 *
 * Takes an array of assignments, validates each against constraints,
 * and saves if all are valid. Returns errors if any fail.
 */
export async function POST(request: NextRequest) {
  try {
    const { assignments } = (await request.json()) as {
      assignments: AssignmentPayload[]
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: 'assignments array is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Validate each assignment
    const allResults: { slotId: string; result: ValidationResult }[] = []
    const validUpdates: { slotId: string; coachId: string }[] = []

    for (const assignment of assignments) {
      // Fetch the slot with experience + lead data
      const { data: slot, error: slotError } = await supabase
        .from('schedule_slots')
        .select(`
          *,
          experience:experiences!experience_id(
            skill_focus,
            lead:leads!lead_id(
              athlete_level,
              athlete_age
            )
          )
        `)
        .eq('id', assignment.schedule_slot_id)
        .single()

      if (slotError || !slot) {
        allResults.push({
          slotId: assignment.schedule_slot_id,
          result: { valid: false, errors: ['Slot not found'], warnings: [] },
        })
        continue
      }

      // Fetch the coach
      const { data: coach, error: coachError } = await supabase
        .from('users')
        .select('id, name, coach_tier')
        .eq('id', assignment.coach_id)
        .single()

      if (coachError || !coach) {
        allResults.push({
          slotId: assignment.schedule_slot_id,
          result: { valid: false, errors: ['Coach not found'], warnings: [] },
        })
        continue
      }

      const experience = slot.experience as Record<string, unknown> | null
      const lead = experience?.lead as Record<string, unknown> | null

      // Build slot to validate
      const slotToValidate: SlotToValidate = {
        coachId: coach.id,
        coachName: coach.name,
        coachTier: coach.coach_tier as CoachTier,
        date: slot.date,
        timeBlock: slot.time_block as TimeBlock,
        dayNumber: slot.day_number,
        isFinalDay: slot.is_final_day,
        athleteLevel: (lead?.athlete_level as SlotToValidate['athleteLevel']) || null,
        athleteAge: (lead?.athlete_age as number) || null,
        skillFocus: (experience?.skill_focus as SlotToValidate['skillFocus']) || 'hitting',
      }

      // Build existing context — check for double-booking + group size
      const { data: existingInBlock } = await supabase
        .from('schedule_slots')
        .select('id, lead_id, status')
        .eq('coach_id', assignment.coach_id)
        .eq('date', slot.date)
        .eq('time_block', slot.time_block)
        .neq('id', slot.id)
        .neq('status', 'canceled')

      const existingCount = existingInBlock?.length || 0

      // Check if any existing slot has a pro athlete
      let hasProInSlot = false
      const existingLevels: (SlotToValidate['athleteLevel'])[] = []

      if (existingInBlock && existingInBlock.length > 0) {
        const leadIds = existingInBlock.map((s) => s.lead_id)
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('id, athlete_level')
          .in('id', leadIds)

        for (const el of existingLeads || []) {
          existingLevels.push(el.athlete_level)
          if (el.athlete_level === 'pro') hasProInSlot = true
        }
      }

      // Get Day 1 tier for this experience
      let day1Tier: CoachTier | null = null
      if (slot.day_number > 1) {
        const { data: day1Slot } = await supabase
          .from('schedule_slots')
          .select('coach_id')
          .eq('experience_id', slot.experience_id)
          .eq('day_number', 1)
          .not('coach_id', 'is', null)
          .limit(1)
          .single()

        if (day1Slot?.coach_id) {
          const { data: day1Coach } = await supabase
            .from('users')
            .select('coach_tier')
            .eq('id', day1Slot.coach_id)
            .single()

          day1Tier = (day1Coach?.coach_tier as CoachTier) || null
        }
      }

      // Check double-booking (coach has a DIFFERENT group in same block)
      const coachDoubleBooked =
        existingCount > 0 && !slot.group_slot_id // different assignment group

      const context: ExistingContext = {
        coachSlotsInBlock:
          existingCount > 0
            ? {
                athleteCount: existingCount,
                hasProAthlete: hasProInSlot,
                athleteLevels: existingLevels,
              }
            : null,
        coachDoubleBooked,
        day1Tier,
      }

      const result = validateAssignment(slotToValidate, context)

      allResults.push({ slotId: assignment.schedule_slot_id, result })

      if (result.valid) {
        validUpdates.push({
          slotId: assignment.schedule_slot_id,
          coachId: assignment.coach_id,
        })
      }
    }

    // Check if all valid
    const hasErrors = allResults.some((r) => !r.result.valid)

    if (hasErrors) {
      return NextResponse.json({
        success: false,
        results: allResults,
      })
    }

    // All valid — save assignments
    for (const update of validUpdates) {
      const { error: updateError } = await supabase
        .from('schedule_slots')
        .update({
          coach_id: update.coachId,
          status: 'scheduled',
        })
        .eq('id', update.slotId)

      if (updateError) {
        console.error('Failed to update slot:', update.slotId, updateError)
        return NextResponse.json(
          { error: `Failed to save assignment for slot ${update.slotId}` },
          { status: 500 }
        )
      }
    }

    // Collect all warnings
    const allWarnings = allResults.flatMap((r) => r.result.warnings)

    return NextResponse.json({
      success: true,
      assigned: validUpdates.length,
      warnings: allWarnings,
    })
  } catch (err) {
    console.error('Schedule assign error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
