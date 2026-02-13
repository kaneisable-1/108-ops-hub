// ============================================
// Scheduling Constants & Configuration
// ============================================

import type { CoachTier, AthleteLevel } from '@/types'

// Tier rank (lower = more senior)
export const TIER_RANK: Record<CoachTier, number> = {
  S1: 1,
  S2: 2,
  J1: 3,
}

// Scoring weights for soft preferences
export const SCORING_WEIGHTS = {
  FINAL_DAY_SENIOR: 100,   // P1: Final day S1/S2 preference
  COACH_CONTINUITY: 50,    // P2: Same coach across days
  LOAD_BALANCE_MAX: 50,    // P3: Balanced load (max points for 0 load)
  LOAD_BALANCE_PER: 5,     // P3: Points per empty slot (10 - load) * 5
  TIER_MATCH: 10,          // P4: Tier matches athlete level
} as const

// Group size limits
export const MAX_GROUP_STANDARD = 3  // G1: Standard max athletes per coach per block
export const MAX_GROUP_PRO = 2       // G2: Pro max (solo or paired with college+)

// Athlete levels that require senior coaches on Day 1
export const SENIOR_REQUIRED_LEVELS: AthleteLevel[] = ['pro', 'college']

// Athlete levels that can be paired with pro
export const PRO_COMPATIBLE_LEVELS: AthleteLevel[] = ['pro', 'college']

// Minimum age for two-way training (R6)
export const MIN_AGE_TWO_WAY = 12

// High-level HS athletes that also require S1/S2 on Day 1
// For now we treat all HS as standard; this can be refined with a flag
export const HIGH_LEVEL_HS_REQUIRES_SENIOR = false
