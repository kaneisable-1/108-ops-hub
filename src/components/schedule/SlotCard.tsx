'use client'

import { cn } from '@/lib/utils'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

interface SlotCardProps {
  slot: ScheduleSlotEnriched
  onClick: (slot: ScheduleSlotEnriched) => void
  compact?: boolean
}

function getTierBadgeClass(tier?: CoachTier): string {
  switch (tier) {
    case 'S1':
      return 'bg-gray-900 text-white'
    case 'S2':
      return 'bg-gray-200 text-gray-700'
    case 'J1':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-400'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'border-l-gray-400'
    case 'in_progress':
      return 'border-l-gray-900'
    case 'completed':
      return 'border-l-gray-400'
    case 'canceled':
      return 'border-l-gray-300'
    case 'conflict':
      return 'border-l-gray-900'
    default:
      return 'border-l-gray-300'
  }
}

function getSkillIcon(skill: string): string {
  return skill === 'pitching' ? '⚾' : '🏏'
}

export default function SlotCard({ slot, onClick, compact = false }: SlotCardProps) {
  const athleteName = slot.athlete_name || slot.contact_name || 'Unassigned'
  const dayLabel = slot.duration_days
    ? `Day ${slot.day_number}/${slot.duration_days}`
    : `Day ${slot.day_number}`

  return (
    <button
      onClick={() => onClick(slot)}
      className={cn(
        'w-full text-left rounded-xl border border-gray-200 bg-white border-l-4 transition-all hover:shadow-sm active:scale-[0.99]',
        getStatusColor(slot.status),
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {athleteName}
            </span>
            {slot.is_final_day && (
              <span className="badge bg-gray-200 text-gray-700 text-[10px]">
                EXIT
              </span>
            )}
          </div>

          {!compact && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>{getSkillIcon(slot.skill)} {slot.skill}</span>
              <span className="text-gray-300">|</span>
              <span>{dayLabel}</span>
              {slot.athlete_age && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>Age {slot.athlete_age}</span>
                </>
              )}
              {slot.athlete_level && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="capitalize">{slot.athlete_level.replace('_', ' ')}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status/tier badge */}
        <div className="flex flex-col items-end gap-1">
          {slot.coach_tier_display && (
            <span className={cn('badge text-[10px]', getTierBadgeClass(slot.coach_tier_display))}>
              {slot.coach_tier_display}
            </span>
          )}
          {slot.status === 'conflict' && (
            <span className="badge bg-gray-900 text-white text-[10px]">CONFLICT</span>
          )}
        </div>
      </div>
    </button>
  )
}
