// ============================================
// Eligibility Filter — Hard Constraints R1, R2, R4
// ============================================

import type { CoachTier, AthleteLevel } from '@/types'
import { TIER_RANK, SENIOR_REQUIRED_LEVELS } from './constants'

export interface CoachInfo {
  id: string
  name: string
  tier: CoachTier
  disciplines: string[]
}

export interface EligibilityInput {
  coaches: CoachInfo[]
  athleteLevel: AthleteLevel | null
  dayNumber: number
  isFirstDay: boolean
  isFinalDay: boolean
  day1Tier: CoachTier | null // tier assigned on Day 1 (null if Day 1)
}

/**
 * Filter coaches by hard tier constraints.
 * Pure function — no DB access.
 *
 * Rules applied:
 * - R1: Day 1 for pro/college requires S1 or S2 (pro requires S1 only)
 * - R2: Day 2+ tier ceiling — can't escalate above Day 1 tier
 * - R4: Pro athletes require S1 on Day 1 AND Final Day
 */
export function getEligibleCoaches(input: EligibilityInput): CoachInfo[] {
  const { coaches, athleteLevel, dayNumber, isFirstDay, isFinalDay, day1Tier } = input

  let eligible = [...coaches]

  if (isFirstDay) {
    // R1 + R4: Day 1 tier requirements based on athlete level
    if (athleteLevel === 'pro') {
      // R4: Pro Day 1 must be S1
      eligible = eligible.filter((c) => c.tier === 'S1')
    } else if (athleteLevel && SENIOR_REQUIRED_LEVELS.includes(athleteLevel)) {
      // R1: College/high-level HS requires S1 or S2
      eligible = eligible.filter((c) => c.tier === 'S1' || c.tier === 'S2')
    }
    // else: any tier OK for non-advanced Day 1
  } else if (dayNumber > 1 && day1Tier) {
    // R2: Day 2+ tier ceiling — can't escalate above Day 1 tier
    const maxRank = TIER_RANK[day1Tier]
    eligible = eligible.filter((c) => TIER_RANK[c.tier] >= maxRank)
  }

  // R4: Pro final day must be S1
  if (isFinalDay && athleteLevel === 'pro') {
    eligible = eligible.filter((c) => c.tier === 'S1')
  }

  return eligible
}
