'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import { useSessions } from '@/hooks/useSessions'
import { useUser } from '@/hooks/useUser'
import { useCoaches } from '@/hooks/useCoaches'
import SessionCard from '@/components/sessions/SessionCard'
import SessionFiltersBar from '@/components/sessions/SessionFilters'
import ParsedNotesDisplay from '@/components/sessions/ParsedNotesDisplay'
import type { SessionEnriched, SessionFilters } from '@/types'

export default function SessionsPage() {
  return (
    <RoleGate allowedRoles={['coach', 'coordinator', 'manager', 'admin']}>
      <DashboardLayout>
        <SessionsContent />
      </DashboardLayout>
    </RoleGate>
  )
}

function SessionsContent() {
  const { user } = useUser()
  const { sessions, loading, fetchSessions } = useSessions()
  const { coaches } = useCoaches()
  const [filters, setFilters] = useState<SessionFilters>({ sentiment: 'all' })
  const [selectedSession, setSelectedSession] = useState<SessionEnriched | null>(null)

  useEffect(() => {
    if (!user) return
    // Coaches see only their own sessions; managers see all
    const sessionFilters = user.role === 'coach'
      ? { ...filters, coach_id: user.id }
      : filters
    fetchSessions(sessionFilters)
  }, [user, filters, fetchSessions])

  const coachList = coaches.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="flex items-center gap-3">
            <FileText size={20} strokeWidth={1.75} style={{ color: 'var(--accent-blue)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Sessions</h1>
          </div>
        </div>
      </div>

      <div className="content-area py-6 space-y-4">
        {/* Filters */}
        <SessionFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          coaches={user?.role === 'coach' ? [] : coachList}
        />

        {/* Session list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <FileText size={24} strokeWidth={1.75} style={{ color: 'var(--text-placeholder)' }} />
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions found</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-placeholder)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="card-list-wide">
            {sessions.map((session) => (
              <div key={session.id}>
                <SessionCard
                  session={session}
                  onClick={setSelectedSession}
                />

                {/* Expanded detail */}
                {selectedSession?.id === session.id && (
                  <SessionDetailExpanded
                    session={session}
                    onClose={() => setSelectedSession(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionDetailExpanded({
  session,
  onClose,
}: {
  session: SessionEnriched
  onClose: () => void
}) {
  const sentimentBadge: Record<string, { bg: string; label: string }> = {
    green: { bg: 'bg-emerald-100 text-emerald-700', label: 'Green — No issues' },
    yellow: { bg: 'bg-amber-100 text-amber-700', label: 'Yellow — Needs discussion' },
    red: { bg: 'bg-red-100 text-red-700', label: 'Red — No-go' },
  }

  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null

  return (
    <div
      className="card p-4 mt-1 space-y-4 animate-fade-in"
      style={{ borderLeft: '4px solid var(--accent-blue)' }}
    >
      {/* Sentiment detail */}
      {sentiment && (
        <div>
          <span className={cn('badge text-xs', sentiment.bg)}>{sentiment.label}</span>
          {session.sentiment_reason && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{session.sentiment_reason}</p>
          )}
        </div>
      )}

      {/* Raw notes */}
      {session.raw_notes && (
        <div>
          <h4 className="section-label mb-1">Raw Notes</h4>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{session.raw_notes}</p>
        </div>
      )}

      {/* AI Parsed notes */}
      {session.parsed_notes && session.ai_parsed_at && (
        <div>
          <h4 className="section-label mb-1">
            AI-Parsed Notes
            <span className="ml-1 normal-case tracking-normal tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
              ({format(new Date(session.ai_parsed_at), 'MMM d, h:mma')})
            </span>
          </h4>
          <ParsedNotesDisplay parsed={session.parsed_notes} />
        </div>
      )}

      {/* Extended mode fields */}
      {session.note_mode === 'extended' && (
        <>
          {session.drills_performed && session.drills_performed.length > 0 && (
            <div>
              <h4 className="section-label mb-1">Drills</h4>
              <div className="flex flex-wrap gap-1">
                {session.drills_performed.map((d, i) => (
                  <span
                    key={i}
                    className="badge text-xs"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {session.athlete_effort_rating && (
            <div>
              <h4 className="section-label mb-1">Effort Rating</h4>
              <p className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{session.athlete_effort_rating}/5</p>
            </div>
          )}
          {session.injury_notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-danger)' }}>Injury Notes</h4>
              <p className="text-sm text-red-700">{session.injury_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Exit eval */}
      {session.is_exit_eval && session.exit_eval && (() => {
        const evalData = session.exit_eval as Record<string, unknown>
        return (
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
            <h4 className="text-xs font-semibold uppercase text-purple-500 mb-2">Exit Evaluation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
              {evalData.progress_rating != null && (
                <div><span style={{ color: 'var(--text-placeholder)' }}>Progress:</span> {String(evalData.progress_rating)}/5</div>
              )}
              {evalData.recommendation != null && (
                <div><span style={{ color: 'var(--text-placeholder)' }}>Rec:</span> {String(evalData.recommendation)}</div>
              )}
              {evalData.would_work_again != null && (
                <div><span style={{ color: 'var(--text-placeholder)' }}>Again:</span> {String(evalData.would_work_again)}</div>
              )}
            </div>
            {evalData.final_notes != null && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{String(evalData.final_notes)}</p>
            )}
          </div>
        )
      })()}

      <button
        onClick={onClose}
        className="text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200 ease-apple cursor-pointer"
        style={{ color: 'var(--text-placeholder)' }}
      >
        Collapse
      </button>
    </div>
  )
}
