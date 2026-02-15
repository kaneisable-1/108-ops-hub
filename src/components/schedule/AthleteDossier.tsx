'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Phone, MapPin, User, Calendar, FileText } from 'lucide-react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { useAthleteDossier, type AthleteDossier as DossierType } from '@/hooks/useAthleteDossier'

interface AthleteDossierProps {
  leadId: string
  /** Start in expanded mode */
  defaultExpanded?: boolean
}

type DisclosureLevel = 'summary' | 'contact' | 'full'

export default function AthleteDossier({ leadId, defaultExpanded = false }: AthleteDossierProps) {
  const { dossier, loading, error, fetchDossier } = useAthleteDossier()
  const [level, setLevel] = useState<DisclosureLevel>(defaultExpanded ? 'contact' : 'summary')

  useEffect(() => {
    fetchDossier(leadId)
  }, [leadId, fetchDossier])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !dossier) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        {error || 'No athlete data'}
      </div>
    )
  }

  const { lead, experiences, sessions } = dossier

  return (
    <div className="space-y-2">
      {/* Level 1: Summary (always visible) */}
      <SummarySection dossier={dossier} level={level} onToggle={setLevel} />

      {/* Level 2: Contact + History (expanded on tap) */}
      {(level === 'contact' || level === 'full') && (
        <ContactHistorySection lead={lead} experiences={experiences} />
      )}

      {/* Level 3: Full session notes (deep expand) */}
      {level === 'full' && sessions.length > 0 && (
        <SessionNotesSection sessions={sessions} />
      )}
    </div>
  )
}

// ---- Level 1: Summary ----

function SummarySection({
  dossier,
  level,
  onToggle,
}: {
  dossier: DossierType
  level: DisclosureLevel
  onToggle: (level: DisclosureLevel) => void
}) {
  const { lead, totalSessions, lastSessionDate } = dossier

  const toggleLevel = () => {
    if (level === 'summary') onToggle('contact')
    else if (level === 'contact') onToggle('full')
    else onToggle('summary')
  }

  return (
    <button
      onClick={toggleLevel}
      className="w-full card p-3 text-left transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-500" />
            <span className="text-sm font-semibold text-gray-900">
              {lead.athlete_name || lead.contact_name || 'Unknown'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            {lead.athlete_age && <span>Age {lead.athlete_age}</span>}
            {lead.athlete_level && (
              <span className="capitalize">{lead.athlete_level.replace('_', ' ')}</span>
            )}
            {lead.athlete_position && <span>{lead.athlete_position}</span>}
            {lead.athlete_velocity && <span>{lead.athlete_velocity}</span>}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            <span>{totalSessions} sessions</span>
            {lastSessionDate && (
              <span>Last: {format(new Date(lastSessionDate + 'T00:00:00'), 'MMM d')}</span>
            )}
          </div>
        </div>

        {level === 'summary' ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </div>
    </button>
  )
}

// ---- Level 2: Contact & History ----

function ContactHistorySection({
  lead,
  experiences,
}: {
  lead: DossierType['lead']
  experiences: DossierType['experiences']
}) {
  return (
    <div className="space-y-2">
      {/* Contact info */}
      <div className="card p-3">
        <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Contact</h4>
        <div className="space-y-1.5">
          {lead.contact_name && (
            <p className="text-sm text-gray-700">{lead.contact_name}</p>
          )}
          {lead.contact_phone && (
            <a
              href={`tel:${lead.contact_phone}`}
              className="flex items-center gap-1.5 text-sm text-brand-600"
            >
              <Phone className="h-3.5 w-3.5" />
              {formatPhoneNumber(lead.contact_phone)}
            </a>
          )}
          {lead.location && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              {lead.location}
              {lead.distance_hours ? ` (${lead.distance_hours}h drive)` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Experience history */}
      {experiences.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">
            Experience History
          </h4>
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-xs',
                  exp.status === 'completed'
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-brand-200 bg-brand-50'
                )}
              >
                <div>
                  <span className="font-medium text-gray-700 capitalize">
                    {exp.skill_focus.replace('_', ' ')}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {format(new Date(exp.start_date + 'T00:00:00'), 'MMM d')} —{' '}
                    {format(new Date(exp.end_date + 'T00:00:00'), 'MMM d')}
                  </span>
                </div>
                <span className={cn(
                  'badge text-[10px]',
                  exp.status === 'completed' && 'bg-gray-100 text-gray-600',
                  exp.status === 'booked' && 'bg-gray-200 text-gray-700',
                  exp.status === 'in_progress' && 'bg-gray-900 text-white',
                  exp.status === 'canceled' && 'bg-gray-100 text-gray-400',
                )}>
                  {exp.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Level 3: Session Notes ----

function SessionNotesSection({ sessions }: { sessions: DossierType['sessions'] }) {
  return (
    <div className="card p-3">
      <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">
        <FileText className="inline h-3 w-3 mr-1" />
        Session Notes
      </h4>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="border-b border-gray-100 pb-2 last:border-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">
                {format(new Date(session.date + 'T00:00:00'), 'EEE, MMM d')}
              </span>
              <span className="text-xs text-gray-400 capitalize">{session.skill}</span>
            </div>

            {session.raw_notes && (
              <p className="text-xs text-gray-600 line-clamp-3">{session.raw_notes}</p>
            )}

            {session.parsed_notes && (
              <div className="mt-1 space-y-1">
                {session.parsed_notes.observations?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Observations:</span>{' '}
                    {session.parsed_notes.observations.join(', ')}
                  </div>
                )}
                {session.parsed_notes.cues_that_worked?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Cues:</span>{' '}
                    {session.parsed_notes.cues_that_worked.join(', ')}
                  </div>
                )}
              </div>
            )}

            {session.is_exit_eval && session.exit_eval && (
              <div className="mt-2 rounded-lg bg-gray-100 p-2">
                <span className="badge bg-gray-200 text-gray-700 text-[10px] mb-1">EXIT EVAL</span>
                {(session.exit_eval as Record<string, string>).progress_review && (
                  <p className="text-xs text-gray-700 mt-1">
                    {(session.exit_eval as Record<string, string>).progress_review}
                  </p>
                )}
                {(session.exit_eval as Record<string, string>).recommended_pathway && (
                  <p className="text-xs text-gray-600 mt-1">
                    Pathway: {(session.exit_eval as Record<string, string>).recommended_pathway}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
