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
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-1">
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
