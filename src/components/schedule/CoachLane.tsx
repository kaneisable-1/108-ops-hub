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
      return 'bg-navy-900'
    case 'S2':
      return 'bg-steel-500'
    case 'J1':
      return 'bg-steel-400'
    default:
      return 'bg-steel-300'
  }
}

export default function CoachLane({ coachName, coachTier, slots, onSlotClick }: CoachLaneProps) {
  const slotCount = slots.filter((s) => s.status !== 'canceled').length
  const hasConflict = slots.some((s) => s.status === 'conflict')

  return (
    <div className={cn(
      'rounded-2xl border bg-white',
      hasConflict ? 'border-steel-400' : 'border-steel-200'
    )}>
      {/* Coach header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-steel-100">
        <div className={cn('h-2 w-2 rounded-full', getTierColor(coachTier))} />
        <span className="text-sm font-semibold text-navy-500">{coachName}</span>
        {coachTier && (
          <span className="text-xs text-steel-400">{coachTier}</span>
        )}
        <span className="ml-auto text-xs text-steel-400">
          {slotCount} {slotCount === 1 ? 'athlete' : 'athletes'}
        </span>
      </div>

      {/* Slots */}
      <div className="space-y-2 p-2">
        {slots.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-steel-400">No assignments</p>
        ) : (
          slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onClick={onSlotClick} compact />
          ))
        )}
      </div>
    </div>
  )
}
