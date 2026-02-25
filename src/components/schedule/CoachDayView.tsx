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
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="px-4 py-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)' }}
          >
            <User size={20} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {isToday(date) ? 'My Day' : format(date, 'EEEE, MMM d')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {coachName} {coachTier && <span style={{ color: 'var(--text-placeholder)' }}>({coachTier})</span>}
              {' — '}
              <span className="tabular-nums">{totalAthletes} {totalAthletes === 1 ? 'athlete' : 'athletes'} today</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {totalAthletes === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <Sun size={24} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions scheduled today</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-placeholder)' }}>Enjoy your day off!</p>
          </div>
        ) : (
          <>
            {/* Morning Block */}
            {morningSlots.length > 0 && (
              <BlockSection
                label="Morning"
                subtitle="Pitching"
                icon={<Sun size={16} strokeWidth={1.75} style={{ color: 'var(--color-warning)' }} />}
                slots={morningSlots}
                onSlotClick={onSlotClick}
              />
            )}

            {/* Afternoon Block */}
            {afternoonSlots.length > 0 && (
              <BlockSection
                label="Afternoon"
                subtitle="Hitting"
                icon={<Moon size={16} strokeWidth={1.75} style={{ color: 'var(--color-narrative)' }} />}
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
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</h2>
        <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>{subtitle}</span>
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
        'card-interactive w-full p-4 text-left',
        slot.is_final_day && 'border-purple-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{athleteName}</h3>
            {slot.is_final_day && (
              <span className="badge bg-gray-200 text-gray-700">EXIT EVAL</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
            {slot.skill_focus && (
              <>
                <span style={{ color: 'var(--border-medium)' }}>|</span>
                <span className="capitalize">{slot.skill_focus.replace('_', ' ')}</span>
              </>
            )}
          </div>

          {/* Contact info */}
          {slot.contact_phone && (
            <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent-blue)' }}>
              <Phone size={12} strokeWidth={1.75} />
              {formatPhoneNumber(slot.contact_phone)}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
