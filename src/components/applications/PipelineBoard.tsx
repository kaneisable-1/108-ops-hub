'use client'

import { useState, useCallback } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { usePipeline, PIPELINE_STAGES } from '@/hooks/usePipeline'
import type { PipelineStage } from '@/types'
import PipelineColumn from './PipelineColumn'

export default function PipelineBoard() {
  const { stageGroups, loading, error, updateStage, refresh } = usePipeline()
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null)

  const handleStageChange = async (leadId: string, newStage: PipelineStage) => {
    try {
      await updateStage(leadId, newStage)
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  const handleDragStart = useCallback((leadId: string) => {
    setDraggingLeadId(leadId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingLeadId(null)
  }, [])

  const handleDrop = useCallback(
    (stage: PipelineStage) => {
      if (draggingLeadId) {
        handleStageChange(draggingLeadId, stage)
        setDraggingLeadId(null)
      }
    },
    [draggingLeadId] // eslint-disable-line react-hooks/exhaustive-deps
  )

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
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-900">{error}</p>
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
          isDragging={draggingLeadId !== null}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
