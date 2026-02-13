'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, PipelineStage } from '@/types'

export const PIPELINE_STAGES: PipelineStage[] = [
  'lead', 'applied', 'accepted', 'booked', 'arrived',
  'completed', 'converting', 'converted', 'nurture',
]

export const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  applied: 'Applied',
  accepted: 'Accepted',
  booked: 'Booked',
  arrived: 'Arrived',
  completed: 'Completed',
  converting: 'Converting',
  converted: 'Converted',
  nurture: 'Nurture',
}

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string }> = {
  lead: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  applied: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  booked: { bg: 'bg-brand-100', text: 'text-brand-700', border: 'border-brand-300' },
  arrived: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  converting: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  converted: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  nurture: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
}

export function usePipeline() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      setLeads((data as Lead[]) || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Realtime subscription
  useEffect(() => {
    fetchLeads()

    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchLeads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLeads, supabase])

  // Group leads by pipeline stage
  const stageGroups = useMemo(() => {
    const groups = new Map<PipelineStage, Lead[]>()
    for (const stage of PIPELINE_STAGES) {
      groups.set(stage, [])
    }
    for (const lead of leads) {
      const stage = (lead.pipeline_stage || 'lead') as PipelineStage
      const group = groups.get(stage)
      if (group) {
        group.push(lead)
      } else {
        // Fallback: put unknown stages in 'lead'
        groups.get('lead')!.push(lead)
      }
    }
    return groups
  }, [leads])

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = {} as Record<PipelineStage, number>
    for (const stage of PIPELINE_STAGES) {
      counts[stage] = stageGroups.get(stage)?.length || 0
    }
    return counts
  }, [stageGroups])

  // Update a lead's pipeline stage
  const updateStage = useCallback(
    async (leadId: string, newStage: PipelineStage) => {
      const res = await fetch('/api/pipeline/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, stage: newStage }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update stage')
      }

      await fetchLeads()
    },
    [fetchLeads]
  )

  return {
    leads,
    stageGroups,
    stageCounts,
    loading,
    error,
    updateStage,
    refresh: fetchLeads,
  }
}
