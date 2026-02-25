'use client'

import { cn } from '@/lib/utils'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'
import SlotCard from './SlotCard'

interface CoachLaneProps {
  coachName: string
  coachTier?: CoachTier
  slots: ScheduleSlotEnriched[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}

function getTierColor(tier?: CoachTier): string {
  switch (tier) {
    case 'S1':
      return 'bg-amber-500'
    case 'S2':
      return 'bg-blue-500'
    case 'J1':
      return 'bg-gray-400'
    default:
      return 'bg-gray-300'
  }
}

export default function CoachLane({ coachName, coachTier, slots, onSlotClick }: CoachLaneProps) {
  const slotCount = slots.filter((s) => s.status !== 'canceled').length
  const hasConflict = slots.some((s) => s.status === 'conflict')

  return (
    <div className={cn(
      'card',
      hasConflict && 'border-red-200'
    )}>
      {/* Coach header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div className={cn('h-2 w-2 rounded-full', getTierColor(coachTier))} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{coachName}</span>
        {coachTier && (
          <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>{coachTier}</span>
        )}
        <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
          {slotCount} {slotCount === 1 ? 'athlete' : 'athletes'}
        </span>
      </div>

      {/* Slots */}
      <div className="space-y-2 p-2">
        {slots.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs" style={{ color: 'var(--text-placeholder)' }}>No assignments</p>
        ) : (
          slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onClick={onSlotClick} compact />
          ))
        )}
      </div>
    </div>
  )
}
