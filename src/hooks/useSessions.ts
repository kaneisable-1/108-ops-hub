'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionEnriched, SessionFilters, SessionNoteInput } from '@/types'

export function useSessions() {
  const [sessions, setSessions] = useState<SessionEnriched[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const lastFiltersRef = useRef<SessionFilters>({})

  const fetchSessions = useCallback(
    async (filters: SessionFilters = {}) => {
      lastFiltersRef.current = filters
      setLoading(true)
      try {
        let query = supabase
          .from('sessions')
          .select(`
            *,
            coach:users!coach_id(id, name, coach_tier),
            lead:leads!lead_id(id, athlete_name, contact_name)
          `)
          .order('date', { ascending: false })
          .limit(100)

        if (filters.coach_id) query = query.eq('coach_id', filters.coach_id)
        if (filters.lead_id) query = query.eq('lead_id', filters.lead_id)
        if (filters.sentiment && filters.sentiment !== 'all') {
          query = query.eq('coach_sentiment', filters.sentiment)
        }
        if (filters.date_from) query = query.gte('date', filters.date_from)
        if (filters.date_to) query = query.lte('date', filters.date_to)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        const enriched: SessionEnriched[] = (data || []).map((s) => ({
          ...s,
          coach_name: s.coach?.name || undefined,
          athlete_name: s.lead?.athlete_name || undefined,
          contact_name: s.lead?.contact_name || undefined,
        }))

        setSessions(enriched)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  const saveNote = useCallback(
    async (input: SessionNoteInput) => {
      const res = await fetch('/api/sessions/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save note')
      }

      return res.json()
    },
    []
  )

  const saveExitEval = useCallback(
    async (evalData: Record<string, unknown>) => {
      const res = await fetch('/api/sessions/exit-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save exit evaluation')
      }

      return res.json()
    },
    []
  )

  const getSessionBySlot = useCallback(
    (slotId: string) => sessions.find((s) => s.schedule_slot_id === slotId),
    [sessions]
  )

  // Real-time subscription — auto-updates when AI-parsed notes complete
  useEffect(() => {
    const channel = supabase
      .channel(`sessions-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          fetchSessions(lastFiltersRef.current)
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useSessions] Realtime subscription error:', status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSessions, supabase])

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionEnriched[]> = {}
    sessions.forEach((s) => {
      if (!grouped[s.date]) grouped[s.date] = []
      grouped[s.date].push(s)
    })
    return grouped
  }, [sessions])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    saveNote,
    saveExitEval,
    getSessionBySlot,
    sessionsByDate,
  }
}
