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
      return 'bg-amber-100 text-amber-700'
    case 'S2':
      return 'bg-blue-100 text-blue-700'
    case 'J1':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-400'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'border-l-emerald-500'
    case 'in_progress':
      return 'border-l-amber-500'
    case 'completed':
      return 'border-l-gray-400'
    case 'canceled':
      return 'border-l-gray-300'
    case 'conflict':
      return 'border-l-red-500'
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
        'w-full text-left rounded-lg border-l-4 transition-all duration-200 ease-apple cursor-pointer active:scale-[0.98]',
        getStatusColor(slot.status),
        compact ? 'p-2' : 'p-3'
      )}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-light)',
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {athleteName}
            </span>
            {slot.is_final_day && (
              <span className="badge bg-purple-100 text-purple-700 text-[10px]">
                EXIT
              </span>
            )}
          </div>

          {!compact && (
            <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>{getSkillIcon(slot.skill)} {slot.skill}</span>
              <span style={{ color: 'var(--border-medium)' }}>|</span>
              <span className="tabular-nums">{dayLabel}</span>
              {slot.athlete_age && (
                <>
                  <span style={{ color: 'var(--border-medium)' }}>|</span>
                  <span className="tabular-nums">Age {slot.athlete_age}</span>
                </>
              )}
              {slot.athlete_level && (
                <>
                  <span style={{ color: 'var(--border-medium)' }}>|</span>
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
            <span className="badge bg-red-100 text-red-700 text-[10px]">CONFLICT</span>
          )}
        </div>
      </div>
    </button>
  )
}
