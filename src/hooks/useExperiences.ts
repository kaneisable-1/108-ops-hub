'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Experience } from '@/types'

export function useExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch all experiences
  const fetchExperiences = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('experiences')
        .select('*')
        .order('start_date', { ascending: false })

      if (fetchError) throw fetchError

      setExperiences(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch experiences')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Fetch upcoming experiences
  const fetchUpcoming = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error: fetchError } = await supabase
        .from('experiences')
        .select(`
          *,
          lead:leads!lead_id(id, athlete_name, contact_name, contact_phone, athlete_age, athlete_level)
        `)
        .gte('start_date', today)
        .in('status', ['booked', 'arrived', 'in_progress'])
        .order('start_date', { ascending: true })

      if (fetchError) throw fetchError

      setExperiences(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upcoming experiences')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Create a new experience
  const createExperience = useCallback(
    async (exp: Partial<Experience>) => {
      const { error } = await supabase
        .from('experiences')
        .insert(exp)

      if (error) throw error

      await fetchExperiences()
    },
    [supabase, fetchExperiences]
  )

  // Update an experience
  const updateExperience = useCallback(
    async (id: string, updates: Partial<Experience>) => {
      const { error } = await supabase
        .from('experiences')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchExperiences()
    },
    [supabase, fetchExperiences]
  )

  // Real-time subscription
  useEffect(() => {
    fetchExperiences()

    const channel = supabase
      .channel(`experiences-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'experiences' },
        () => {
          fetchExperiences()
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useExperiences] Realtime subscription error:', status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchExperiences, supabase])

  // Filter to active (non-canceled, non-completed) experiences
  const activeExperiences = useMemo(() => {
    return experiences.filter(
      (exp) => exp.status !== 'canceled' && exp.status !== 'completed'
    )
  }, [experiences])

  return {
    experiences,
    loading,
    error,
    fetchExperiences,
    fetchUpcoming,
    createExperience,
    updateExperience,
    activeExperiences,
    refresh: fetchExperiences,
  }
}
