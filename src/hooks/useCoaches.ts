'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CoachSummary, CoachTier } from '@/types'

export function useCoaches() {
  const [coaches, setCoaches] = useState<CoachSummary[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch all coaches
  const fetchCoaches = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, coach_tier, disciplines')
        .eq('is_coach', true)
        .order('name', { ascending: true })

      if (error) throw error

      setCoaches(data || [])
    } catch (err) {
      console.error('Failed to fetch coaches:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  // Filter coaches by tier
  const getCoachesByTier = useMemo(() => {
    return (tier: CoachTier) => coaches.filter((c) => c.coach_tier === tier)
  }, [coaches])

  // Filter coaches by discipline
  const getCoachesByDiscipline = useMemo(() => {
    return (discipline: string) =>
      coaches.filter((c) => c.disciplines?.includes(discipline))
  }, [coaches])

  return {
    coaches,
    loading,
    getCoachesByTier,
    getCoachesByDiscipline,
    refresh: fetchCoaches,
  }
}
