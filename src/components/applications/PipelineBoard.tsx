'use client'

import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { usePipeline, PIPELINE_STAGES } from '@/hooks/usePipeline'
import type { PipelineStage } from '@/types'
import PipelineColumn from './PipelineColumn'

export default function PipelineBoard() {
  const { stageGroups, loading, error, updateStage, refresh } = usePipeline()

  const handleStageChange = async (leadId: string, newStage: PipelineStage) => {
    try {
      await updateStage(leadId, newStage)
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={32} strokeWidth={1.75} style={{ color: 'var(--color-danger)' }} />
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw size={14} strokeWidth={1.75} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 px-1">
      {PIPELINE_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          leads={stageGroups.get(stage) || []}
          onStageChange={handleStageChange}
        />
      ))}
    </div>
  )
}
