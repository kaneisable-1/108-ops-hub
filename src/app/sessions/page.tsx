'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
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
      <SessionsContent />
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
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-brand-500" />
          <h1 className="text-lg font-bold text-gray-900">Sessions</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <SessionFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          coaches={user?.role === 'coach' ? [] : coachList}
        />

        {/* Session list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-2">
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
    green: { bg: 'bg-green-100 text-green-700', label: 'Green — No issues' },
    yellow: { bg: 'bg-amber-100 text-amber-700', label: 'Yellow — Needs discussion' },
    red: { bg: 'bg-red-100 text-red-700', label: 'Red — No-go' },
  }

  const sentiment = session.coach_sentiment ? sentimentBadge[session.coach_sentiment] : null

  return (
    <div className="card p-4 mt-1 space-y-4 border-l-4 border-brand-200">
      {/* Sentiment detail */}
      {sentiment && (
        <div>
          <span className={cn('badge text-xs', sentiment.bg)}>{sentiment.label}</span>
          {session.sentiment_reason && (
            <p className="text-xs text-gray-600 mt-1">{session.sentiment_reason}</p>
          )}
        </div>
      )}

      {/* Raw notes */}
      {session.raw_notes && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Raw Notes</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.raw_notes}</p>
        </div>
      )}

      {/* AI Parsed notes */}
      {session.parsed_notes && session.ai_parsed_at && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">
            AI-Parsed Notes
            <span className="text-gray-300 ml-1 normal-case">
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
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Drills</h4>
              <div className="flex flex-wrap gap-1">
                {session.drills_performed.map((d, i) => (
                  <span key={i} className="badge bg-brand-50 text-brand-700 text-xs">{d}</span>
                ))}
              </div>
            </div>
          )}
          {session.athlete_effort_rating && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1">Effort Rating</h4>
              <p className="text-sm text-gray-700">{session.athlete_effort_rating}/5</p>
            </div>
          )}
          {session.injury_notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-red-400 mb-1">Injury Notes</h4>
              <p className="text-sm text-red-700">{session.injury_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Exit eval */}
      {session.is_exit_eval && session.exit_eval && (() => {
        const evalData = session.exit_eval as Record<string, unknown>
        return (
          <div className="border-t border-purple-100 pt-3">
            <h4 className="text-xs font-semibold uppercase text-purple-500 mb-2">Exit Evaluation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {evalData.progress_rating != null && (
                <div><span className="text-gray-400">Progress:</span> {String(evalData.progress_rating)}/5</div>
              )}
              {evalData.recommendation != null && (
                <div><span className="text-gray-400">Rec:</span> {String(evalData.recommendation)}</div>
              )}
              {evalData.would_work_again != null && (
                <div><span className="text-gray-400">Again:</span> {String(evalData.would_work_again)}</div>
              )}
            </div>
            {evalData.final_notes != null && (
              <p className="text-xs text-gray-600 mt-2">{String(evalData.final_notes)}</p>
            )}
          </div>
        )
      })()}

      <button
        onClick={onClose}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Collapse
      </button>
    </div>
  )
}
