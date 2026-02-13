// ============================================
// Suggest Assignments — Orchestrator
// ============================================

import type {
  CoachTier,
  AthleteLevel,
  TimeBlock,
  Skill,
  SlotSuggestion,
  BlockSuggestion,
  CoachSuggestionScore,
} from '@/types'
import { MIN_AGE_TWO_WAY } from './constants'
import { getEligibleCoaches, type CoachInfo } from './eligibility'
import { filterAvailable, type ExistingSlot, type AvailabilityDay } from './availability'
import { rankCoaches, type PriorAssignment, type CoachLoad } from './ranking'

export interface ExperienceInput {
  athleteLevel: AthleteLevel | null
  athleteAge: number | null
  skillFocus: 'hitting' | 'pitching' | 'two_way'
  dates: string[] // sorted date strings (YYYY-MM-DD)
}

export interface ScheduleContext {
  coaches: CoachInfo[]
  existingSlots: ExistingSlot[]
  coachAvailability: AvailabilityDay[]
  coachLoads: CoachLoad[] // total slots per coach today
}

/**
 * Suggest coach assignments for a new Experience.
 * Pure function — no DB access.
 *
 * For each date in the experience, determines which time blocks
 * are needed, then runs: eligibility → availability → ranking.
 */
export function suggestAssignments(
  experience: ExperienceInput,
  context: ScheduleContext
): SlotSuggestion[] {
  const { athleteLevel, athleteAge, skillFocus, dates } = experience
  const { coaches, existingSlots, coachAvailability, coachLoads } = context

  const totalDays = dates.length
  const suggestions: SlotSuggestion[] = []

  // Track assignments made during suggestion (for continuity scoring)
  const priorAssignments: PriorAssignment[] = []
  // Track which day's coach tier was assigned for Day 1
  let day1Tier: CoachTier | null = null

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dayNumber = i + 1
    const isFirstDay = dayNumber === 1
    const isFinalDay = dayNumber === totalDays

    // Determine blocks needed based on skill focus + age
    const blocks = getTimeBlocks(skillFocus, athleteAge)

    const blockSuggestions: BlockSuggestion[] = []

    for (const { timeBlock, skill } of blocks) {
      // Step 1: Eligibility filter (hard constraints)
      const eligible = getEligibleCoaches({
        coaches,
        athleteLevel,
        dayNumber,
        isFirstDay,
        isFinalDay,
        day1Tier,
      })

      // Step 2: Availability filter (capacity + schedule)
      const available = filterAvailable({
        eligible,
        date,
        timeBlock,
        athleteLevel,
        existingSlots,
        coachAvailability,
      })

      // Step 3: Ranking (soft preferences)
      const ranked = rankCoaches({
        available,
        athleteLevel,
        priorAssignments,
        isFinalDay,
        coachLoads,
      })

      if (ranked.length === 0) {
        // No eligible coach — flag conflict
        blockSuggestions.push({
          time_block: timeBlock,
          skill,
          suggested_coach: null,
          alternatives: [],
          conflict: `No eligible coach available for ${skill} on ${date} (${timeBlock})`,
        })
      } else {
        const best = ranked[0]
        const alternatives = ranked.slice(1, 4).map(toSuggestionScore)

        blockSuggestions.push({
          time_block: timeBlock,
          skill,
          suggested_coach: toSuggestionScore(best),
          alternatives,
          conflict: null,
        })

        // Track for continuity scoring on subsequent days
        priorAssignments.push({
          dayNumber,
          coachId: best.coach.id,
        })

        // Track Day 1 tier for ceiling rule
        if (isFirstDay && !day1Tier) {
          day1Tier = best.coach.tier
        }
      }
    }

    suggestions.push({
      date,
      day_number: dayNumber,
      is_final_day: isFinalDay,
      blocks: blockSuggestions,
    })
  }

  return suggestions
}

// ---- Helpers ----

function getTimeBlocks(
  skillFocus: 'hitting' | 'pitching' | 'two_way',
  athleteAge: number | null
): { timeBlock: TimeBlock; skill: Skill }[] {
  // R6: Under 12 cannot do two-way
  if (skillFocus === 'two_way' && (athleteAge === null || athleteAge >= MIN_AGE_TWO_WAY)) {
    // T1: Morning = Pitching, Afternoon = Hitting
    return [
      { timeBlock: 'morning', skill: 'pitching' },
      { timeBlock: 'afternoon', skill: 'hitting' },
    ]
  }

  if (skillFocus === 'pitching') {
    return [{ timeBlock: 'morning', skill: 'pitching' }]
  }

  // Default: hitting in afternoon
  return [{ timeBlock: 'afternoon', skill: 'hitting' }]
}

function toSuggestionScore(ranked: {
  coach: CoachInfo
  score: number
}): CoachSuggestionScore {
  return {
    id: ranked.coach.id,
    name: ranked.coach.name,
    tier: ranked.coach.tier,
    score: ranked.score,
  }
}
