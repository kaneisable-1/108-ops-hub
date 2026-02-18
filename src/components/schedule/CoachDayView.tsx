'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, isToday } from 'date-fns'
import { Sun, Moon, Phone, User, FileText, CheckCircle, Play } from 'lucide-react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

interface CoachDayViewProps {
  coachName: string
  coachTier?: CoachTier
  date: Date
  slots: ScheduleSlotEnriched[]
  onSlotClick: (slot: ScheduleSlotEnriched) => void
}

export default function CoachDayView({ coachName, coachTier, date, slots, onSlotClick }: CoachDayViewProps) {
  const [slotsWithNotes, setSlotsWithNotes] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const { morningSlots, afternoonSlots } = useMemo(() => ({
    morningSlots: slots.filter((s) => s.time_block === 'morning' && s.status !== 'canceled'),
    afternoonSlots: slots.filter((s) => s.time_block === 'afternoon' && s.status !== 'canceled'),
  }), [slots])

  const totalAthletes = morningSlots.length + afternoonSlots.length

  // Check which slots already have session notes
  useEffect(() => {
    async function checkSessionNotes() {
      const slotIds = slots.filter((s) => s.status !== 'canceled').map((s) => s.id)
      if (slotIds.length === 0) return

      const { data } = await supabase
        .from('sessions')
        .select('schedule_slot_id')
        .in('schedule_slot_id', slotIds)

      if (data) {
        setSlotsWithNotes(new Set(data.map((s) => s.schedule_slot_id).filter(Boolean)))
      }
    }
    checkSessionNotes()
  }, [slots, supabase])

  const completedCount = slots.filter((s) => s.status === 'completed').length
  const notesCount = slotsWithNotes.size

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <User className="h-5 w-5 text-brand-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {isToday(date) ? 'My Day' : format(date, 'EEEE, MMM d')}
            </h1>
            <p className="text-xs text-gray-500">
              {coachName} {coachTier && <span className="text-gray-400">({coachTier})</span>}
              {' — '}
              {totalAthletes} {totalAthletes === 1 ? 'athlete' : 'athletes'} today
            </p>
          </div>
          {/* Progress summary */}
          {totalAthletes > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle className="h-3 w-3" />
                {completedCount}/{totalAthletes}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <FileText className="h-3 w-3" />
                {notesCount} notes
              </div>
            </div>
          )}
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
                icon={<Sun className="h-4 w-4 text-gray-500" />}
                slots={morningSlots}
                slotsWithNotes={slotsWithNotes}
                onSlotClick={onSlotClick}
              />
            )}

            {/* Afternoon Block */}
            {afternoonSlots.length > 0 && (
              <BlockSection
                label="Afternoon"
                subtitle="Hitting"
                icon={<Moon className="h-4 w-4 text-gray-400" />}
                slots={afternoonSlots}
                slotsWithNotes={slotsWithNotes}
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
  slotsWithNotes,
  onSlotClick,
}: {
  label: string
  subtitle: string
  icon: React.ReactNode
  slots: ScheduleSlotEnriched[]
  slotsWithNotes: Set<string>
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
          <AthleteCard
            key={slot.id}
            slot={slot}
            hasNotes={slotsWithNotes.has(slot.id)}
            onClick={() => onSlotClick(slot)}
          />
        ))}
      </div>
    </div>
  )
}

function AthleteCard({
  slot,
  hasNotes,
  onClick,
}: {
  slot: ScheduleSlotEnriched
  hasNotes: boolean
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
        slot.is_final_day && 'border-gray-400',
        slot.status === 'completed' && 'bg-gray-50',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{athleteName}</h3>
            {slot.is_final_day && (
              <span className="badge bg-gray-200 text-gray-700">EXIT EVAL</span>
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

        {/* Status & note indicators */}
        <div className="flex flex-col items-end gap-1.5 ml-2 shrink-0">
          {/* Slot status badge */}
          <span className={cn(
            'badge text-[10px]',
            slot.status === 'scheduled' && 'bg-gray-100 text-gray-600',
            slot.status === 'in_progress' && 'bg-gray-900 text-white',
            slot.status === 'completed' && 'bg-gray-200 text-gray-600',
          )}>
            {slot.status === 'scheduled' && <><Play className="h-2.5 w-2.5 mr-0.5" />Scheduled</>}
            {slot.status === 'in_progress' && <><Play className="h-2.5 w-2.5 mr-0.5" />In Progress</>}
            {slot.status === 'completed' && <><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Done</>}
          </span>

          {/* Notes indicator */}
          {hasNotes ? (
            <span className="flex items-center gap-0.5 text-[10px] text-brand-600 font-medium">
              <FileText className="h-2.5 w-2.5" />
              Notes
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <FileText className="h-2.5 w-2.5" />
              No notes
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
