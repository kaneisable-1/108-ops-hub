'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Application } from '@/types'

export interface ApplicationWithLead extends Application {
  athlete_name?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  athlete_level?: string | null
  athlete_age?: number | null
  lead_temperature?: string | null
}

type ApplicationStatus = Application['status'] | 'all'

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationWithLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all')
  const supabase = createClient()

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('applications')
        .select(`
          *,
          lead:leads!lead_id(
            athlete_name,
            contact_name,
            contact_phone,
            athlete_level,
            athlete_age,
            lead_temperature
          )
        `)
        .order('submitted_at', { ascending: false })

      if (fetchError) throw fetchError

      const enriched: ApplicationWithLead[] = (data || []).map((app) => {
        const lead = app.lead as Record<string, unknown> | null
        return {
          ...app,
          athlete_name: lead?.athlete_name as string | null,
          contact_name: lead?.contact_name as string | null,
          contact_phone: lead?.contact_phone as string | null,
          athlete_level: lead?.athlete_level as string | null,
          athlete_age: lead?.athlete_age as number | null,
          lead_temperature: lead?.lead_temperature as string | null,
          lead: undefined,
        }
      })

      setApplications(enriched)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Realtime subscription
  useEffect(() => {
    fetchApplications()

    const channel = supabase
      .channel(`applications-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          fetchApplications()
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useApplications] Realtime subscription error:', status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchApplications, supabase])

  // Filtered applications
  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications
    return applications.filter((app) => app.status === statusFilter)
  }, [applications, statusFilter])

  // Counts by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length }
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1
    }
    return counts
  }, [applications])

  // Make a decision on an application
  const makeDecision = useCallback(
    async (
      applicationId: string,
      decision: 'accepted' | 'rejected' | 'need_more_info',
      reviewedBy: string,
      reviewNotes?: string,
      decisionReason?: string
    ) => {
      const res = await fetch('/api/applications/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          decision,
          reviewed_by: reviewedBy,
          review_notes: reviewNotes,
          decision_reason: decisionReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit decision')
      }

      await fetchApplications()
      return res.json()
    },
    [fetchApplications]
  )

  return {
    applications: filteredApplications,
    allApplications: applications,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    statusCounts,
    makeDecision,
    refresh: fetchApplications,
  }
}
