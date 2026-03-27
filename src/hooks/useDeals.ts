'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealStatus, DealFilters } from '@/types'

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const supabase = createClient()

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('deals')
        .select(`
          *,
          staff:users!staff_id(name),
          lead:leads!lead_id(contact_name),
          pkg:packages!package(display_name)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const enriched = (data || []).map((deal) => ({
        ...deal,
        staff_name: deal.staff?.name || null,
        lead_name: deal.lead?.contact_name || null,
        package_display_name: deal.pkg?.display_name || null,
      }))

      setDeals(enriched)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deals')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDeals()

    const channel = supabase
      .channel(`deals-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals' },
        () => {
          fetchDeals()
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false)
          console.error('[useDeals] Realtime subscription error:', status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDeals, supabase])

  const updateDealStatus = useCallback(
    async (dealId: string, status: DealStatus) => {
      const { error } = await supabase
        .from('deals')
        .update({ status })
        .eq('id', dealId)

      if (error) throw error
      await fetchDeals()
    },
    [supabase, fetchDeals]
  )

  return {
    deals,
    loading,
    error,
    realtimeConnected,
    updateDealStatus,
    refresh: fetchDeals,
  }
}

export function useFilteredDeals(deals: Deal[], filters: DealFilters) {
  return useMemo(() => {
    let filtered = [...deals]

    if (filters.status !== 'all') {
      filtered = filtered.filter((d) => d.status === filters.status)
    }

    if (filters.staff_id) {
      filtered = filtered.filter((d) => d.staff_id === filters.staff_id)
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.athlete_name?.toLowerCase().includes(q) ||
          d.athlete_phone?.includes(q) ||
          d.athlete_email?.toLowerCase().includes(q) ||
          d.package_display_name?.toLowerCase().includes(q) ||
          d.staff_name?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q)
      )
    }

    if (filters.dateRange !== 'all') {
      const cutoff = new Date()
      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(cutoff.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(cutoff.getMonth() - 1)
          break
      }
      filtered = filtered.filter((d) => new Date(d.created_at) >= cutoff)
    }

    return filtered
  }, [deals, filters])
}

export function useDealStatusCounts(deals: Deal[]) {
  return useMemo(() => {
    const counts: Record<DealStatus | 'all', number> = {
      all: deals.length,
      pending_confirmation: 0,
      confirmed: 0,
      contract_sent: 0,
      contract_signed: 0,
      payment_sent: 0,
      payment_complete: 0,
      scheduling: 0,
      complete: 0,
      expired: 0,
      canceled: 0,
      payment_failed: 0,
      delivery_failed: 0,
      ghl_failed: 0,
    }

    deals.forEach((deal) => {
      if (deal.status in counts) {
        counts[deal.status]++
      }
    })

    return counts
  }, [deals])
}
