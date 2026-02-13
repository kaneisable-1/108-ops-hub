// ============================================
// Ranking Function — Soft Preferences P1-P4
// ============================================

import type { AthleteLevel } from '@/types'
import type { CoachInfo } from './eligibility'
import { SCORING_WEIGHTS } from './constants'

export interface CoachLoad {
  coachId: string
  slotsToday: number
}

export interface PriorAssignment {
  dayNumber: number
  coachId: string
}

export interface RankingInput {
  available: CoachInfo[]
  athleteLevel: AthleteLevel | null
  priorAssignments: PriorAssignment[]
  isFinalDay: boolean
  coachLoads: CoachLoad[]
}

export interface RankedCoach {
  coach: CoachInfo
  score: number
}

/**
 * Rank available coaches by soft preference scoring.
 * Pure function — no DB access.
 *
 * Preferences applied:
 * - P1: Final day S1/S2 preference (+100)
 * - P2: Coach continuity — same coach across days (+50)
 * - P3: Load balancing — fewer slots today = higher score (max +50)
 * - P4: Tier match — senior for advanced, junior for youth (+10)
 */
export function rankCoaches(input: RankingInput): RankedCoach[] {
  const { available, athleteLevel, priorAssignments, isFinalDay, coachLoads } = input

  const priorCoachIds = new Set(priorAssignments.map((a) => a.coachId))

  const scored: RankedCoach[] = available.map((coach) => {
    let score = 0

    // P1: Final day S1/S2 preference
    if (isFinalDay && (coach.tier === 'S1' || coach.tier === 'S2')) {
      score += SCORING_WEIGHTS.FINAL_DAY_SENIOR
    }

    // P2: Coach continuity
    if (priorCoachIds.has(coach.id)) {
      score += SCORING_WEIGHTS.COACH_CONTINUITY
    }

    // P3: Load balancing — fewer existing slots today = higher score
    const load = coachLoads.find((l) => l.coachId === coach.id)
    const slotsToday = load?.slotsToday ?? 0
    score += Math.max(0, (10 - slotsToday)) * SCORING_WEIGHTS.LOAD_BALANCE_PER

    // P4: Tier preference (tiebreaker)
    if (
      (athleteLevel === 'pro' || athleteLevel === 'college') &&
      coach.tier === 'S1'
    ) {
      score += SCORING_WEIGHTS.TIER_MATCH
    } else if (
      (athleteLevel === 'youth' || athleteLevel === 'middle_school') &&
      coach.tier === 'J1'
    ) {
      score += SCORING_WEIGHTS.TIER_MATCH
    }

    return { coach, score }
  })

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  return scored
}
