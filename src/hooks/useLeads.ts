'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadQueue, LeadActivity, DashboardFilters, CallOutcome } from '@/types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const supabase = createClient()

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select(`
          *,
          claimer:users!claimed_by(name)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const enriched = (data || []).map((lead) => ({
        ...lead,
        tags: lead.tags || [],
        claimed_by_name: lead.claimer?.name || null,
      }))

      setLeads(enriched)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Real-time subscription
  useEffect(() => {
    fetchLeads()

    const channel = supabase
      .channel(`leads-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchLeads()
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false)
          console.error('[useLeads] Realtime subscription error:', status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLeads, supabase])

  // Claim a lead
  const claimLead = useCallback(
    async (leadId: string, userId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({
          claimed_by: userId,
          claimed_at: new Date().toISOString(),
          status: 'claimed',
        })
        .eq('id', leadId)

      if (error) throw error

      // Log activity
      await supabase.from('lead_activity').insert({
        lead_id: leadId,
        user_id: userId,
        action: 'claimed this lead',
      })

      await fetchLeads()
    },
    [supabase, fetchLeads]
  )

  // Update status
  const updateStatus = useCallback(
    async (leadId: string, status: Lead['status'], userId?: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId)

      if (error) throw error

      await supabase.from('lead_activity').insert({
        lead_id: leadId,
        user_id: userId || null,
        action: `changed status to ${status}`,
      })

      await fetchLeads()
    },
    [supabase, fetchLeads]
  )

  // Log call outcome
  const logCallOutcome = useCallback(
    async (leadId: string, outcome: CallOutcome, notes: string, userId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({
          call_outcome: outcome,
          call_notes: notes,
          status: outcome === 'booked' ? 'converted' : 'contacted',
        })
        .eq('id', leadId)

      if (error) throw error

      await supabase.from('lead_activity').insert({
        lead_id: leadId,
        user_id: userId,
        action: `logged call outcome: ${outcome}`,
        details: { notes },
      })

      await fetchLeads()
    },
    [supabase, fetchLeads]
  )

  // Fetch activity for a lead
  const fetchActivity = useCallback(
    async (leadId: string): Promise<LeadActivity[]> => {
      const { data, error } = await supabase
        .from('lead_activity')
        .select(`
          *,
          user:users!user_id(name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((act) => ({
        ...act,
        user_name: act.user?.name || null,
      }))
    },
    [supabase]
  )

  return {
    leads,
    loading,
    error,
    realtimeConnected,
    claimLead,
    updateStatus,
    logCallOutcome,
    fetchActivity,
    refresh: fetchLeads,
  }
}

// Filter hook
export function useFilteredLeads(leads: Lead[], filters: DashboardFilters) {
  return useMemo(() => {
    let filtered = [...leads]

    // Queue filter
    if (filters.queue !== 'all') {
      filtered = filtered.filter((l) => l.queue === filters.queue)
    }

    // Temperature filter
    if (filters.temperature !== 'all') {
      filtered = filtered.filter((l) => l.lead_temperature === filters.temperature)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((l) => l.status === filters.status)
    }

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.contact_name?.toLowerCase().includes(q) ||
          l.athlete_name?.toLowerCase().includes(q) ||
          l.contact_phone?.includes(q) ||
          l.contact_email?.toLowerCase().includes(q) ||
          l.ai_summary?.toLowerCase().includes(q) ||
          l.location?.toLowerCase().includes(q)
      )
    }

    // Channel filter
    if (filters.channel && filters.channel !== 'all') {
      filtered = filtered.filter((l) => l.channel === filters.channel)
    }

    // Service match filter
    if (filters.serviceMatch && filters.serviceMatch !== 'all') {
      filtered = filtered.filter((l) => l.service_match === filters.serviceMatch)
    }

    // Date range
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()

      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter(
        (l) => new Date(l.created_at) >= cutoff
      )
    }

    return filtered
  }, [leads, filters])
}

// Queue counts
export function useQueueCounts(leads: Lead[]) {
  return useMemo(() => {
    const counts: Record<LeadQueue | 'all', number> = {
      all: leads.length,
      call_now: 0,
      follow_up: 0,
      nurture: 0,
      not_a_fit: 0,
    }

    leads.forEach((lead) => {
      if (lead.queue in counts) {
        counts[lead.queue as LeadQueue]++
      }
    })

    return counts
  }, [leads])
}
