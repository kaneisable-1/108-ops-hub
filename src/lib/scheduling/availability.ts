// ============================================
// Availability Filter — G1, G2, T3
// ============================================

import type { AthleteLevel, TimeBlock } from '@/types'
import { MAX_GROUP_STANDARD, MAX_GROUP_PRO, PRO_COMPATIBLE_LEVELS } from './constants'
import type { CoachInfo } from './eligibility'

export interface ExistingSlot {
  coachId: string
  date: string
  timeBlock: TimeBlock
  athleteLevel: AthleteLevel | null
  athleteCount: number
  isPro: boolean // slot contains a pro athlete
}

export interface AvailabilityDay {
  coachId: string
  date: string
  available: boolean
}

export interface AvailabilityInput {
  eligible: CoachInfo[]
  date: string
  timeBlock: TimeBlock
  athleteLevel: AthleteLevel | null
  existingSlots: ExistingSlot[]
  coachAvailability: AvailabilityDay[]
}

/**
 * Filter eligible coaches by availability and capacity.
 * Pure function — no DB access.
 *
 * Rules applied:
 * - T3: A coach can only be in one slot per time block (unless group slot)
 * - G1: Standard max 3 athletes per coach per block
 * - G2: Pro needs solo or paired with college+ only (max 2)
 * - Coach availability (vacation/sick days)
 */
export function filterAvailable(input: AvailabilityInput): CoachInfo[] {
  const { eligible, date, timeBlock, athleteLevel, existingSlots, coachAvailability } = input

  const isPro = athleteLevel === 'pro'
  const available: CoachInfo[] = []

  for (const coach of eligible) {
    // Check coach availability (vacation, sick, etc.)
    const avail = coachAvailability.find(
      (a) => a.coachId === coach.id && a.date === date
    )
    if (avail && !avail.available) continue

    // T3: Check existing slots for this coach on this date+block
    const coachSlots = existingSlots.filter(
      (s) => s.coachId === coach.id && s.date === date && s.timeBlock === timeBlock
    )

    if (coachSlots.length === 0) {
      // Completely free — eligible
      available.push(coach)
      continue
    }

    // Coach has existing assignment(s) in this block — check group capacity
    const slot = coachSlots[0]
    const currentCount = slot.athleteCount

    if (isPro) {
      // G2: Pro needs solo or paired with college+ only
      if (currentCount === 0) {
        available.push(coach)
      } else if (
        currentCount === 1 &&
        slot.athleteLevel &&
        PRO_COMPATIBLE_LEVELS.includes(slot.athleteLevel)
      ) {
        available.push(coach)
      }
      // else: slot full or incompatible for pro
    } else {
      // G1: Standard max 3
      if (currentCount < MAX_GROUP_STANDARD) {
        // Can't add non-college to a pro slot
        if (!slot.isPro) {
          available.push(coach)
        } else if (
          athleteLevel &&
          PRO_COMPATIBLE_LEVELS.includes(athleteLevel)
        ) {
          // College athlete can join a pro slot if under G2 limit
          if (currentCount < MAX_GROUP_PRO) {
            available.push(coach)
          }
        }
      }
    }
  }

  return available
}
