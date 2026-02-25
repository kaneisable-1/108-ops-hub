'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Phone, MapPin, User, FileText } from 'lucide-react'
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
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error || !dossier) {
    return (
      <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-placeholder)' }}>
        {error || 'No athlete data'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Level 1: Summary (always visible) */}
      <SummarySection dossier={dossier} level={level} onToggle={setLevel} />

      {/* Level 2: Contact + History (expanded on tap) */}
      {(level === 'contact' || level === 'full') && (
        <div className="animate-fade-in">
          <ContactHistorySection lead={dossier.lead} experiences={dossier.experiences} />
        </div>
      )}

      {/* Level 3: Full session notes (deep expand) */}
      {level === 'full' && dossier.sessions.length > 0 && (
        <div className="animate-fade-in">
          <SessionNotesSection sessions={dossier.sessions} />
        </div>
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
      className="card-interactive w-full p-3 text-left"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <User size={16} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {lead.athlete_name || lead.contact_name || 'Unknown'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {lead.athlete_age && <span className="tabular-nums">Age {lead.athlete_age}</span>}
            {lead.athlete_level && (
              <span className="capitalize">{lead.athlete_level.replace('_', ' ')}</span>
            )}
            {lead.athlete_position && <span>{lead.athlete_position}</span>}
            {lead.athlete_velocity && <span>{lead.athlete_velocity}</span>}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
            <span>{totalSessions} sessions</span>
            {lastSessionDate && (
              <span>Last: {format(new Date(lastSessionDate + 'T00:00:00'), 'MMM d')}</span>
            )}
          </div>
        </div>

        {level === 'summary' ? (
          <ChevronDown size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-placeholder)' }} />
        ) : (
          <ChevronUp size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-placeholder)' }} />
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
        <h4 className="section-label mb-2">Contact</h4>
        <div className="space-y-1.5">
          {lead.contact_name && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lead.contact_name}</p>
          )}
          {lead.contact_phone && (
            <a
              href={`tel:${lead.contact_phone}`}
              className="flex items-center gap-1.5 text-sm transition-colors duration-200"
              style={{ color: 'var(--accent-blue)' }}
            >
              <Phone size={14} strokeWidth={1.75} />
              {formatPhoneNumber(lead.contact_phone)}
            </a>
          )}
          {lead.location && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <MapPin size={14} strokeWidth={1.75} />
              {lead.location}
              {lead.distance_hours ? ` (${lead.distance_hours}h drive)` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Experience history */}
      {experiences.length > 0 && (
        <div className="card p-3">
          <h4 className="section-label mb-2">Experience History</h4>
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: exp.status === 'completed' ? 'var(--border-light)' : 'color-mix(in srgb, var(--accent-blue) 30%, transparent)',
                  background: exp.status === 'completed' ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--accent-blue) 8%, transparent)',
                }}
              >
                <div>
                  <span className="font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {exp.skill_focus.replace('_', ' ')}
                  </span>
                  <span className="ml-2 tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
                    {format(new Date(exp.start_date + 'T00:00:00'), 'MMM d')} —{' '}
                    {format(new Date(exp.end_date + 'T00:00:00'), 'MMM d')}
                  </span>
                </div>
                <span className={cn(
                  'badge text-[10px]',
                  exp.status === 'completed' && 'bg-emerald-100 text-emerald-700',
                  exp.status === 'booked' && 'bg-blue-100 text-blue-700',
                  exp.status === 'in_progress' && 'bg-amber-100 text-amber-700',
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
      <h4 className="section-label mb-2">
        <FileText size={12} strokeWidth={1.75} className="inline mr-1" />
        Session Notes
      </h4>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="pb-2 last:border-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {format(new Date(session.date + 'T00:00:00'), 'EEE, MMM d')}
              </span>
              <span className="text-xs capitalize" style={{ color: 'var(--text-placeholder)' }}>{session.skill}</span>
            </div>

            {session.raw_notes && (
              <p className="text-xs line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{session.raw_notes}</p>
            )}

            {session.parsed_notes && (
              <div className="mt-1 space-y-1">
                {session.parsed_notes.observations?.length > 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="font-medium">Observations:</span>{' '}
                    {session.parsed_notes.observations.join(', ')}
                  </div>
                )}
                {session.parsed_notes.cues_that_worked?.length > 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
