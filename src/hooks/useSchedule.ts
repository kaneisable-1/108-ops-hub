'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlotEnriched } from '@/types'

export function useSchedule() {
  const [slots, setSlots] = useState<ScheduleSlotEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch slots for a date range
  const fetchSlots = useCallback(
    async (startDate: string, endDate: string) => {
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('schedule_slots')
          .select(`
            *,
            lead:leads!lead_id(id, athlete_name, contact_name, contact_phone, athlete_age, athlete_level),
            coach:users!coach_id(id, name, coach_tier),
            experience:experiences!experience_id(id, start_date, end_date, skill_focus, status, duration_days)
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .order('time_block', { ascending: true })

        if (fetchError) throw fetchError

        const enriched: ScheduleSlotEnriched[] = (data || []).map((slot) => ({
          ...slot,
          coach_name: slot.coach?.name || undefined,
          coach_tier_display: slot.coach?.coach_tier || undefined,
          athlete_name: slot.lead?.athlete_name || undefined,
          contact_name: slot.lead?.contact_name || undefined,
          contact_phone: slot.lead?.contact_phone || undefined,
          athlete_age: slot.lead?.athlete_age || undefined,
          athlete_level: slot.lead?.athlete_level || undefined,
          experience_start: slot.experience?.start_date || undefined,
          experience_end: slot.experience?.end_date || undefined,
          skill_focus: slot.experience?.skill_focus || undefined,
          experience_status: slot.experience?.status || undefined,
          duration_days: slot.experience?.duration_days || undefined,
        }))

        setSlots(enriched)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule slots')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // Assign a coach to a slot
  const assignCoach = useCallback(
    async (slotId: string, coachId: string) => {
      const { error } = await supabase
        .from('schedule_slots')
        .update({ coach_id: coachId })
        .eq('id', slotId)

      if (error) throw error
    },
    [supabase]
  )

  // Update slot status
  const updateSlotStatus = useCallback(
    async (slotId: string, status: string) => {
      const { error } = await supabase
        .from('schedule_slots')
        .update({ status })
        .eq('id', slotId)

      if (error) throw error
    },
    [supabase]
  )

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('schedule-slots-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_slots' },
        () => {
          if (slots.length > 0) {
            const dates = slots.map((s) => s.date).sort()
            const startDate = dates[0]
            const endDate = dates[dates.length - 1]
            fetchSlots(startDate, endDate)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSlots, supabase, slots])

  // Group slots by date
  const getSlotsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleSlotEnriched[]> = {}
    slots.forEach((slot) => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = []
      }
      grouped[slot.date].push(slot)
    })
    return grouped
  }, [slots])

  // Group slots by coach
  const getSlotsByCoach = useMemo(() => {
    const grouped: Record<string, ScheduleSlotEnriched[]> = {}
    slots.forEach((slot) => {
      const coachId = slot.coach_id || 'unassigned'
      if (!grouped[coachId]) {
        grouped[coachId] = []
      }
      grouped[coachId].push(slot)
    })
    return grouped
  }, [slots])

  return {
    slots,
    loading,
    error,
    fetchSlots,
    assignCoach,
    updateSlotStatus,
    getSlotsByDate,
    getSlotsByCoach,
    refresh: fetchSlots,
  }
}
