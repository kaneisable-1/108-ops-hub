'use client'

import { useState, useEffect } from 'react'
import { X, Phone, User, Calendar, Clock, FileText, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatPhoneNumber } from '@/lib/utils'
import type { ScheduleSlotEnriched, SessionEnriched } from '@/types'
import AthleteDossier from './AthleteDossier'
import SessionNoteForm from '@/components/sessions/SessionNoteForm'
import ExitEvalForm from '@/components/sessions/ExitEvalForm'
import ParsedNotesDisplay from '@/components/sessions/ParsedNotesDisplay'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'

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
  const [existingSession, setExistingSession] = useState<SessionEnriched | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const supabase = createClient()

  // Check for existing session notes for this slot
  useEffect(() => {
    async function checkExistingSession() {
      setLoadingSession(true)
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('schedule_slot_id', slot.id)
        .limit(1)
        .maybeSingle()

      if (data) {
        setExistingSession(data as SessionEnriched)
        setNoteSaved(true)
      }
      setLoadingSession(false)
    }
    checkExistingSession()
  }, [slot.id, supabase])

  const canEnterNotes = !loadingSession && slot.status !== 'canceled' && slot.coach_id && user?.id
  const showNoteForm = canEnterNotes && !existingSession && !noteSaved
  const showExistingNotes = existingSession && !showEditForm
  const showExitEval = slot.is_final_day && noteSaved && !exitEvalSaved && !existingSession?.exit_eval

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

          {/* Loading session state */}
          {loadingSession && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}

          {/* Existing Session Notes (read-only view) */}
          {showExistingNotes && existingSession && (
            <div className="card p-4 space-y-3 border-l-4 border-brand-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-500" />
                  <h3 className="text-xs font-semibold uppercase text-gray-400">Session Notes</h3>
                </div>
                {user?.id === slot.coach_id && (
                  <button
                    onClick={() => setShowEditForm(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {/* Sentiment */}
              {existingSession.coach_sentiment && (
                <div>
                  <span className={cn(
                    'badge text-xs',
                    existingSession.coach_sentiment === 'green' && 'bg-gray-100 text-gray-700',
                    existingSession.coach_sentiment === 'yellow' && 'bg-gray-300 text-gray-800',
                    existingSession.coach_sentiment === 'red' && 'bg-gray-900 text-white',
                  )}>
                    {existingSession.coach_sentiment === 'green' && 'Green — No issues'}
                    {existingSession.coach_sentiment === 'yellow' && 'Yellow — Needs discussion'}
                    {existingSession.coach_sentiment === 'red' && 'Red — No-go'}
                  </span>
                  {existingSession.sentiment_reason && (
                    <p className="text-xs text-gray-600 mt-1">{existingSession.sentiment_reason}</p>
                  )}
                </div>
              )}

              {/* Raw notes */}
              {existingSession.raw_notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingSession.raw_notes}</p>
                </div>
              )}

              {/* AI Parsed notes */}
              {existingSession.parsed_notes && existingSession.ai_parsed_at && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">
                    AI-Parsed
                    <span className="text-gray-300 ml-1 normal-case">
                      ({format(new Date(existingSession.ai_parsed_at), 'MMM d, h:mma')})
                    </span>
                  </h4>
                  <ParsedNotesDisplay parsed={existingSession.parsed_notes} />
                </div>
              )}

              {/* Extended fields */}
              {existingSession.drills_performed && existingSession.drills_performed.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Drills</h4>
                  <div className="flex flex-wrap gap-1">
                    {existingSession.drills_performed.map((d, i) => (
                      <span key={i} className="badge bg-gray-100 text-gray-700 text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {existingSession.athlete_effort_rating && (
                <div className="text-xs text-gray-600">
                  Effort: {existingSession.athlete_effort_rating}/5
                </div>
              )}
            </div>
          )}

          {/* Session Notes Form — shows for new entries */}
          {showNoteForm && (
            <SessionNoteForm
              slot={slot}
              coachId={user!.id}
              onSaved={() => setNoteSaved(true)}
            />
          )}

          {/* Edit existing notes */}
          {showEditForm && existingSession && canEnterNotes && (
            <SessionNoteForm
              slot={slot}
              coachId={user!.id}
              existingNotes={existingSession.raw_notes || ''}
              onSaved={() => {
                setShowEditForm(false)
                setNoteSaved(true)
                // Refresh existing session
                supabase
                  .from('sessions')
                  .select('*')
                  .eq('schedule_slot_id', slot.id)
                  .limit(1)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data) setExistingSession(data as SessionEnriched)
                  })
              }}
            />
          )}

          {/* Exit Evaluation — shows on final day after notes saved */}
          {showExitEval && (
            <ExitEvalForm
              sessionId={existingSession?.id || slot.id}
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
