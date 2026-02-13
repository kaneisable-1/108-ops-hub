'use client'

import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Sun, Moon, Phone, User } from 'lucide-react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

interface CoachDayViewProps {
  coachName: string
  coachTier?: CoachTier
  date: Date
  slots: ScheduleSlotEnriched[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}

export default function CoachDayView({ coachName, coachTier, date, slots, onSlotClick }: CoachDayViewProps) {
  const { morningSlots, afternoonSlots } = useMemo(() => ({
    morningSlots: slots.filter((s) => s.time_block === 'morning' && s.status !== 'canceled'),
    afternoonSlots: slots.filter((s) => s.time_block === 'afternoon' && s.status !== 'canceled'),
  }), [slots])

  const totalAthletes = morningSlots.length + afternoonSlots.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <User className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isToday(date) ? 'My Day' : format(date, 'EEEE, MMM d')}
            </h1>
            <p className="text-xs text-gray-500">
              {coachName} {coachTier && <span className="text-gray-400">({coachTier})</span>}
              {' — '}
              {totalAthletes} {totalAthletes === 1 ? 'athlete' : 'athletes'} today
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {totalAthletes === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Sun className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-sm text-gray-500">No sessions scheduled today</p>
            <p className="mt-1 text-xs text-gray-400">Enjoy your day off!</p>
          </div>
        ) : (
          <>
            {/* Morning Block */}
            {morningSlots.length > 0 && (
              <BlockSection
                label="Morning"
                subtitle="Pitching"
                icon={<Sun className="h-4 w-4 text-amber-500" />}
                slots={morningSlots}
                onSlotClick={onSlotClick}
              />
            )}

            {/* Afternoon Block */}
            {afternoonSlots.length > 0 && (
              <BlockSection
                label="Afternoon"
                subtitle="Hitting"
                icon={<Moon className="h-4 w-4 text-indigo-500" />}
                slots={afternoonSlots}
                onSlotClick={onSlotClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BlockSection({
  label,
  subtitle,
  icon,
  slots,
  onSlotClick,
}: {
  label: string
  subtitle: string
  icon: React.ReactNode
  slots: ScheduleSlotEnriched[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => (
          <AthleteCard key={slot.id} slot={slot} onClick={() => onSlotClick(slot)} />
        ))}
      </div>
    </div>
  )
}

function AthleteCard({
  slot,
  onClick,
}: {
  slot: ScheduleSlotEnriched
  onClick: () => void
}) {
  const athleteName = slot.athlete_name || slot.contact_name || 'Unknown'
  const dayLabel = slot.duration_days
    ? `Day ${slot.day_number}/${slot.duration_days}`
    : `Day ${slot.day_number}`

  return (
    <button
      onClick={onClick}
      className={cn(
        'card w-full p-4 text-left transition-all hover:shadow-md active:scale-[0.99]',
        slot.is_final_day && 'border-purple-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{athleteName}</h3>
            {slot.is_final_day && (
              <span className="badge bg-purple-100 text-purple-700">EXIT EVAL</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
            {slot.skill_focus && (
              <>
                <span className="text-gray-300">|</span>
                <span className="capitalize">{slot.skill_focus.replace('_', ' ')}</span>
              </>
            )}
          </div>

          {/* Contact info */}
          {slot.contact_phone && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-600">
              <Phone className="h-3 w-3" />
              {formatPhoneNumber(slot.contact_phone)}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
