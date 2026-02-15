'use client'

import { useState } from 'react'
import { X, Phone, MapPin, User, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatPhoneNumber } from '@/lib/utils'
import type { ScheduleSlotEnriched } from '@/types'
import AthleteDossier from './AthleteDossier'
import SessionNoteForm from '@/components/sessions/SessionNoteForm'
import ExitEvalForm from '@/components/sessions/ExitEvalForm'
import { useUser } from '@/hooks/useUser'

interface SlotDetailProps {
  slot: ScheduleSlotEnriched
  onClose: () => void
}

export default function SlotDetail({ slot, onClose }: SlotDetailProps) {
  const athleteName = slot.athlete_name || slot.contact_name || 'Unknown'
  const dayLabel = slot.duration_days
    ? `Day ${slot.day_number} of ${slot.duration_days}`
    : `Day ${slot.day_number}`

  const { user } = useUser()
  const [noteSaved, setNoteSaved] = useState(false)
  const [exitEvalSaved, setExitEvalSaved] = useState(false)

  const showNoteForm = slot.status !== 'canceled' && slot.coach_id && user?.id
  const showExitEval = slot.is_final_day && noteSaved && !exitEvalSaved

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-safe shadow-xl">
        {/* Handle */}
        <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 border-b border-gray-100 rounded-t-3xl">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{athleteName}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500">{dayLabel}</p>
        </div>

        <div className="space-y-4 p-4">
          {/* Status & Schedule Info */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Session Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                value={format(new Date(slot.date + 'T00:00:00'), 'EEE, MMM d')}
              />
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Block"
                value={slot.time_block === 'morning' ? 'Morning (Pitching)' : 'Afternoon (Hitting)'}
              />
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Coach"
                value={slot.coach_name || 'Unassigned'}
              />
              <InfoItem
                label="Skill"
                value={slot.skill}
              />
              <InfoItem
                label="Status"
                value={
                  <span className={cn(
                    'badge text-xs capitalize',
                    slot.status === 'scheduled' && 'bg-gray-100 text-gray-700',
                    slot.status === 'in_progress' && 'bg-gray-900 text-white',
                    slot.status === 'completed' && 'bg-gray-100 text-gray-600',
                    slot.status === 'conflict' && 'bg-gray-900 text-white',
                    slot.status === 'canceled' && 'bg-gray-100 text-gray-400',
                  )}>
                    {slot.status.replace('_', ' ')}
                  </span>
                }
              />
              {slot.is_final_day && (
                <InfoItem
                  label="Exit Eval"
                  value={<span className="badge bg-gray-200 text-gray-700 text-xs">Final Day</span>}
                />
              )}
            </div>
          </div>

          {/* Athlete Details */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Athlete</h3>
            <div className="space-y-2">
              {slot.athlete_name && (
                <p className="text-sm text-gray-900 font-medium">{slot.athlete_name}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {slot.athlete_age && <span>Age {slot.athlete_age}</span>}
                {slot.athlete_level && (
                  <span className="capitalize">{slot.athlete_level.replace('_', ' ')}</span>
                )}
                {slot.skill_focus && (
                  <span className="badge bg-brand-50 text-brand-700">{slot.skill_focus.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {(slot.contact_name || slot.contact_phone) && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Contact</h3>
              {slot.contact_name && (
                <p className="text-sm text-gray-900">{slot.contact_name}</p>
              )}
              {slot.contact_phone && (
                <a
                  href={`tel:${slot.contact_phone}`}
                  className="mt-1 flex items-center gap-2 text-sm text-brand-600"
                >
                  <Phone className="h-4 w-4" />
                  {formatPhoneNumber(slot.contact_phone)}
                </a>
              )}
            </div>
          )}

          {/* Experience Timeline */}
          {(slot.experience_start || slot.experience_end) && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Experience</h3>
              <p className="text-sm text-gray-700">
                {slot.experience_start && format(new Date(slot.experience_start + 'T00:00:00'), 'MMM d')}
                {' — '}
                {slot.experience_end && format(new Date(slot.experience_end + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
              {slot.experience_status && (
                <span className="mt-1 badge bg-gray-100 text-gray-600 text-xs capitalize">
                  {slot.experience_status.replace('_', ' ')}
                </span>
              )}
            </div>
          )}

          {/* Conflict info */}
          {slot.conflict_reason && (
            <div className="card border-gray-400 bg-gray-50 p-4">
              <h3 className="text-xs font-semibold uppercase text-gray-900 mb-1">Conflict</h3>
              <p className="text-sm text-gray-700">{slot.conflict_reason}</p>
            </div>
          )}

          {/* Session Notes — shows for non-canceled slots */}
          {showNoteForm && (
            <SessionNoteForm
              slot={slot}
              coachId={user!.id}
              onSaved={() => setNoteSaved(true)}
            />
          )}

          {/* Exit Evaluation — shows on final day after notes saved */}
          {showExitEval && (
            <ExitEvalForm
              sessionId={slot.id}
              athleteName={athleteName}
              onSaved={() => setExitEvalSaved(true)}
            />
          )}

          {/* Athlete Dossier (progressive disclosure) */}
          {slot.lead_id && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2 px-1">Athlete Dossier</h3>
              <AthleteDossier leadId={slot.lead_id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}
