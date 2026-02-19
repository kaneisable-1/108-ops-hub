'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import RoleGate from '@/components/layout/RoleGate'
import DashboardLayout from '@/components/DashboardLayout'
import { useSessions } from '@/hooks/useSessions'
import { useUser } from '@/hooks/useUser'
import { useCoaches } from '@/hooks/useCoaches'
import SessionCard from '@/components/sessions/SessionCard'
import SessionFiltersBar from '@/components/sessions/SessionFilters'
import ParsedNotesDisplay from '@/components/sessions/ParsedNotesDisplay'
import NewSessionNoteModal from '@/components/sessions/NewSessionNoteModal'
import { createClient } from '@/lib/supabase/client'
import { isPreviewMode, MOCK_LEADS } from '@/lib/mock-data'
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
  const { sessions, loading, fetchSessions, sessionsByDate } = useSessions()
  const { coaches } = useCoaches()
  const [filters, setFilters] = useState<SessionFilters>({ sentiment: 'all' })
  const [selectedSession, setSelectedSession] = useState<SessionEnriched | null>(null)
  const [showNewNote, setShowNewNote] = useState(false)
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const sessionFilters = user.role === 'coach'
      ? { ...filters, coach_id: user.id }
      : filters
    fetchSessions(sessionFilters)
  }, [user, filters, fetchSessions])

  // Load athletes for the new note form
  useEffect(() => {
    async function loadAthletes() {
      if (isPreviewMode()) {
        const mockAthletes = MOCK_LEADS
          .filter((l) => ['booked', 'arrived', 'completed', 'converting', 'converted'].includes(l.pipeline_stage || ''))
          .map((l) => ({ id: l.id, name: l.athlete_name || l.contact_name || 'Unknown' }))
        setAthletes(mockAthletes)
        return
      }
      const { data } = await supabase
        .from('leads')
        .select('id, athlete_name, contact_name')
        .in('pipeline_stage', ['booked', 'arrived', 'completed', 'converting', 'converted'])
        .order('athlete_name', { ascending: true })
        .limit(200)

      if (data) {
        setAthletes(
          data.map((l) => ({
            id: l.id,
            name: l.athlete_name || l.contact_name || 'Unknown',
          }))
        )
      }
    }
    loadAthletes()
  }, [supabase])

  const coachList = coaches.map((c) => ({ id: c.id, name: c.name }))

  // Sort dates descending
  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a))

  const handleNoteSaved = () => {
    setShowNewNote(false)
    // Refresh sessions list
    const sessionFilters = user?.role === 'coach'
      ? { ...filters, coach_id: user.id }
      : filters
    fetchSessions(sessionFilters)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-500" />
            <h1 className="text-lg font-bold text-gray-900">Sessions</h1>
            <span className="badge bg-gray-100 text-gray-600 text-xs">
              {sessions.length}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <SessionFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          coaches={user?.role === 'coach' ? [] : coachList}
        />

        {/* Session list — grouped by date */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sessions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {user?.role === 'coach'
                ? 'Your session notes will appear here'
                : 'Session notes from coaches will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const daySessions = sessionsByDate[dateKey]
              const dateObj = new Date(dateKey + 'T00:00:00')
              const dateLabel = format(dateObj, 'EEEE, MMM d')
              const sentimentCounts = {
                green: daySessions.filter((s) => s.coach_sentiment === 'green').length,
                yellow: daySessions.filter((s) => s.coach_sentiment === 'yellow').length,
                red: daySessions.filter((s) => s.coach_sentiment === 'red').length,
              }

              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-xs font-semibold uppercase text-gray-400">
                      {dateLabel}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {sentimentCounts.green > 0 && (
                        <span className="badge bg-gray-100 text-gray-600 text-[10px]">
                          {sentimentCounts.green} green
                        </span>
                      )}
                      {sentimentCounts.yellow > 0 && (
                        <span className="badge bg-gray-300 text-gray-700 text-[10px]">
                          {sentimentCounts.yellow} yellow
                        </span>
                      )}
                      {sentimentCounts.red > 0 && (
                        <span className="badge bg-gray-900 text-white text-[10px]">
                          {sentimentCounts.red} red
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Session cards for this date */}
                  <div className="space-y-2">
                    {daySessions.map((session) => (
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB: New Session Note */}
      {user && (user.role === 'coach' || user.role === 'admin' || user.role === 'manager') && (
        <button
          onClick={() => setShowNewNote(true)}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 active:bg-brand-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* New Session Note Modal */}
      {showNewNote && user && (
        <NewSessionNoteModal
          coachId={user.id}
          coachName={user.name}
          athletes={athletes}
          onSaved={handleNoteSaved}
          onClose={() => setShowNewNote(false)}
        />
      )}
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
    green: { bg: 'bg-gray-100 text-gray-700', label: 'Green — No issues' },
    yellow: { bg: 'bg-gray-200 text-gray-600', label: 'Yellow — Needs discussion' },
    red: { bg: 'bg-gray-900 text-white', label: 'Red — No-go' },
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
                  <span key={i} className="badge bg-gray-100 text-gray-700 text-xs">{d}</span>
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
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Injury Notes</h4>
              <p className="text-sm text-gray-900 font-medium">{session.injury_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Exit eval */}
      {session.is_exit_eval && session.exit_eval && (() => {
        const evalData = session.exit_eval as Record<string, unknown>
        return (
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Exit Evaluation</h4>
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
