'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CoachAvailability } from '@/types'

export function useCoachAvailability() {
  const [availability, setAvailability] = useState<CoachAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch availability for a date range
  const fetchAvailability = useCallback(
    async (startDate: string, endDate: string) => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('coach_availability')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })

        if (error) throw error

        setAvailability(data || [])
      } catch (err) {
        console.error('Failed to fetch coach availability:', err)
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // Set availability for a coach on a date (upsert)
  const setCoachAvailability = useCallback(
    async (coachId: string, date: string, available: boolean, reason?: string) => {
      const { error } = await supabase
        .from('coach_availability')
        .upsert(
          { coach_id: coachId, date, available, reason: reason || null },
          { onConflict: 'coach_id,date' }
        )

      if (error) throw error
    },
    [supabase]
  )

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('coach-availability-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coach_availability' },
        () => {
          if (availability.length > 0) {
            const dates = availability.map((a) => a.date).sort()
            const startDate = dates[0]
            const endDate = dates[dates.length - 1]
            fetchAvailability(startDate, endDate)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAvailability, supabase, availability])

  return {
    availability,
    loading,
    fetchAvailability,
    setAvailability: setCoachAvailability,
    refresh: fetchAvailability,
  }
}
