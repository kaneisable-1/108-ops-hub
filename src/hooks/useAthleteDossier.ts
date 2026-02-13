'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Session, Experience } from '@/types'

export interface AthleteDossier {
  lead: Lead
  experiences: Experience[]
  sessions: Session[]
  totalSessions: number
  lastSessionDate: string | null
}

export function useAthleteDossier() {
  const [dossier, setDossier] = useState<AthleteDossier | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchDossier = useCallback(
    async (leadId: string) => {
      setLoading(true)
      setError(null)

      try {
        // Fetch lead info
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single()

        if (leadError) throw leadError

        // Fetch experiences
        const { data: experiences, error: expError } = await supabase
          .from('experiences')
          .select('*')
          .eq('lead_id', leadId)
          .order('start_date', { ascending: false })

        if (expError) throw expError

        // Fetch sessions
        const { data: sessions, error: sessError } = await supabase
          .from('sessions')
          .select('*')
          .eq('lead_id', leadId)
          .order('date', { ascending: false })
          .limit(20)

        if (sessError) throw sessError

        const sessionList = (sessions || []) as Session[]

        setDossier({
          lead: lead as Lead,
          experiences: (experiences || []) as Experience[],
          sessions: sessionList,
          totalSessions: sessionList.length,
          lastSessionDate: sessionList.length > 0 ? sessionList[0].date : null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athlete dossier')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  const clear = useCallback(() => {
    setDossier(null)
    setError(null)
  }, [])

  return {
    dossier,
    loading,
    error,
    fetchDossier,
    clear,
  }
}
