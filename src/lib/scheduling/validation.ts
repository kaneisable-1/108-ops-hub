// ============================================
// Assignment Validation — All Hard Constraints
// ============================================

import type { CoachTier, AthleteLevel, TimeBlock, ValidationResult } from '@/types'
import {
  TIER_RANK,
  MAX_GROUP_STANDARD,
  MAX_GROUP_PRO,
  PRO_COMPATIBLE_LEVELS,
  MIN_AGE_TWO_WAY,
} from './constants'

export interface SlotToValidate {
  coachId: string
  coachName: string
  coachTier: CoachTier
  date: string
  timeBlock: TimeBlock
  dayNumber: number
  isFinalDay: boolean
  athleteLevel: AthleteLevel | null
  athleteAge: number | null
  skillFocus: 'hitting' | 'pitching' | 'two_way'
}

export interface ExistingContext {
  // Other slots for this coach on this date+block
  coachSlotsInBlock: {
    athleteCount: number
    hasProAthlete: boolean
    athleteLevels: (AthleteLevel | null)[]
  } | null
  // Coach has another distinct assignment in this block?
  coachDoubleBooked: boolean
  // Day 1 coach tier for this experience
  day1Tier: CoachTier | null
}

/**
 * Validate an assignment against all hard and soft constraints.
 * Pure function — no DB access.
 *
 * Returns errors (block save) and warnings (allow save, flag).
 */
export function validateAssignment(
  slot: SlotToValidate,
  context: ExistingContext
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // HARD: Coach double-booking (T3)
  if (context.coachDoubleBooked) {
    errors.push(
      `${slot.coachName} is already assigned to another session at ${slot.timeBlock} on ${slot.date}`
    )
  }

  // HARD: Group size exceeded (G1/G2)
  if (context.coachSlotsInBlock) {
    const currentCount = context.coachSlotsInBlock.athleteCount
    const maxSize =
      slot.athleteLevel === 'pro' || context.coachSlotsInBlock.hasProAthlete
        ? MAX_GROUP_PRO
        : MAX_GROUP_STANDARD

    if (currentCount >= maxSize) {
      errors.push(
        `Group size limit exceeded (${currentCount + 1}/${maxSize}) for ${slot.coachName}`
      )
    }
  }

  // HARD: Pro grouping violation (R5/G2)
  if (context.coachSlotsInBlock) {
    const hasProInSlot = context.coachSlotsInBlock.hasProAthlete
    const isProAthlete = slot.athleteLevel === 'pro'

    if (isProAthlete && context.coachSlotsInBlock.athleteCount > 0) {
      // Pro joining existing group — all must be college+
      const incompatible = context.coachSlotsInBlock.athleteLevels.some(
        (level) => !level || !PRO_COMPATIBLE_LEVELS.includes(level)
      )
      if (incompatible) {
        errors.push('Pro athlete cannot be grouped with non-college athletes')
      }
    } else if (hasProInSlot && slot.athleteLevel) {
      // Non-pro joining a pro slot
      if (!PRO_COMPATIBLE_LEVELS.includes(slot.athleteLevel)) {
        errors.push('Cannot add non-college athlete to a slot with a pro athlete')
      }
    }
  }

  // HARD: Tier violation for Day 1 (R1/R4)
  if (slot.dayNumber === 1) {
    if (slot.athleteLevel === 'pro' && slot.coachTier !== 'S1') {
      errors.push(`Pro athlete Day 1 requires S1 coach (assigned: ${slot.coachTier})`)
    } else if (
      slot.athleteLevel === 'college' &&
      slot.coachTier !== 'S1' &&
      slot.coachTier !== 'S2'
    ) {
      errors.push(
        `College athlete Day 1 requires S1/S2 coach (assigned: ${slot.coachTier})`
      )
    }
  }

  // HARD: Tier ceiling violation (R2) — Day 2+ can't escalate above Day 1
  if (slot.dayNumber > 1 && context.day1Tier) {
    const day1Rank = TIER_RANK[context.day1Tier]
    const currentRank = TIER_RANK[slot.coachTier]
    if (currentRank < day1Rank) {
      errors.push(
        `Coach tier ${slot.coachTier} is higher than Day 1 tier ${context.day1Tier} — tier escalation not allowed`
      )
    }
  }

  // HARD: Pro final day must be S1 (R4)
  if (slot.isFinalDay && slot.athleteLevel === 'pro' && slot.coachTier !== 'S1') {
    errors.push(`Pro athlete final day requires S1 coach (assigned: ${slot.coachTier})`)
  }

  // HARD: Under-12 two-way violation (R6)
  if (
    slot.athleteAge !== null &&
    slot.athleteAge < MIN_AGE_TWO_WAY &&
    slot.skillFocus === 'two_way'
  ) {
    errors.push('Athletes under 12 cannot do two-way training')
  }

  // SOFT: Final day not S1/S2 (P1)
  if (slot.isFinalDay && slot.coachTier === 'J1') {
    warnings.push('Final day exit evaluation recommended with S1/S2 coach')
  }

  // SOFT: Unusual tier escalation override (informational)
  if (slot.dayNumber > 1 && context.day1Tier) {
    const day1Rank = TIER_RANK[context.day1Tier]
    const currentRank = TIER_RANK[slot.coachTier]
    if (currentRank < day1Rank) {
      // Already caught as hard error above, but if overridden:
      warnings.push(
        `Coach tier ${slot.coachTier} is higher than Day 1 coach — unusual assignment`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
