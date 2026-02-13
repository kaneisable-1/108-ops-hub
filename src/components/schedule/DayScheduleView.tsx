'use client'

import { useMemo } from 'react'
import { Sun, Moon } from 'lucide-react'
import type { ScheduleSlotEnriched } from '@/types'
import CoachLane from './CoachLane'

interface DayScheduleViewProps {
  slots: ScheduleSlotEnriched[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}

export default function DayScheduleView({ slots, onSlotClick }: DayScheduleViewProps) {
  // Group slots by time block, then by coach
  const { morningByCoach, afternoonByCoach } = useMemo(() => {
    const morning = slots.filter((s) => s.time_block === 'morning')
    const afternoon = slots.filter((s) => s.time_block === 'afternoon')

    const groupByCoach = (blockSlots: ScheduleSlotEnriched[]) => {
      const map = new Map<string, { name: string; tier?: string; slots: ScheduleSlotEnriched[] }>()

      for (const slot of blockSlots) {
        const coachId = slot.coach_id || 'unassigned'
        const existing = map.get(coachId) || {
          name: slot.coach_name || 'Unassigned',
          tier: slot.coach_tier_display,
          slots: [],
        }
        existing.slots.push(slot)
        map.set(coachId, existing)
      }

      return Array.from(map.values()).sort((a, b) => {
        // Sort: S1 first, then S2, then J1, then unassigned
        const tierOrder = { S1: 0, S2: 1, J1: 2 }
        const aOrder = a.tier ? tierOrder[a.tier as keyof typeof tierOrder] ?? 3 : 3
        const bOrder = b.tier ? tierOrder[b.tier as keyof typeof tierOrder] ?? 3 : 3
        return aOrder - bOrder
      })
    }

    return {
      morningByCoach: groupByCoach(morning),
      afternoonByCoach: groupByCoach(afternoon),
    }
  }, [slots])

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <Sun className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mt-3 text-sm text-gray-500">No sessions scheduled for this day</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Morning Block */}
      <TimeBlockSection
        label="Morning"
        icon={<Sun className="h-4 w-4 text-amber-500" />}
        subtitle="Pitching"
        coaches={morningByCoach}
        onSlotClick={onSlotClick}
      />

      {/* Afternoon Block */}
      <TimeBlockSection
        label="Afternoon"
        icon={<Moon className="h-4 w-4 text-indigo-500" />}
        subtitle="Hitting"
        coaches={afternoonByCoach}
        onSlotClick={onSlotClick}
      />
    </div>
  )
}

interface TimeBlockSectionProps {
  label: string
  icon: React.ReactNode
  subtitle: string
  coaches: { name: string; tier?: string; slots: ScheduleSlotEnriched[] }[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}

function TimeBlockSection({ label, icon, subtitle, coaches, onSlotClick }: TimeBlockSectionProps) {
  if (coaches.length === 0) return null

  const totalAthletes = coaches.reduce(
    (sum, c) => sum + c.slots.filter((s) => s.status !== 'canceled').length,
    0
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{subtitle}</span>
        <span className="ml-auto text-xs text-gray-400">
          {totalAthletes} {totalAthletes === 1 ? 'athlete' : 'athletes'}
        </span>
      </div>

      <div className="space-y-3">
        {coaches.map((coach) => (
          <CoachLane
            key={coach.name}
            coachName={coach.name}
            coachTier={coach.tier as import('@/types').CoachTier}
            slots={coach.slots}
            onSlotClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  )
}
