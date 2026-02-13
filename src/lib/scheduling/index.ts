// ============================================
// Scheduling Algorithm — Barrel Export
// ============================================

export { getEligibleCoaches } from './eligibility'
export type { CoachInfo, EligibilityInput } from './eligibility'

export { filterAvailable } from './availability'
export type { ExistingSlot, AvailabilityDay, AvailabilityInput } from './availability'

export { rankCoaches } from './ranking'
export type { CoachLoad, PriorAssignment, RankingInput, RankedCoach } from './ranking'

export { validateAssignment } from './validation'
export type { SlotToValidate, ExistingContext } from './validation'

export { suggestAssignments } from './suggest'
export type { ExperienceInput, ScheduleContext } from './suggest'

export {
  TIER_RANK,
  SCORING_WEIGHTS,
  MAX_GROUP_STANDARD,
  MAX_GROUP_PRO,
  SENIOR_REQUIRED_LEVELS,
  PRO_COMPATIBLE_LEVELS,
  MIN_AGE_TWO_WAY,
} from './constants'
