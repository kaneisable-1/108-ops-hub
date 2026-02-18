'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { STAGE_LABELS, STAGE_COLORS } from '@/hooks/usePipeline'
import type { Lead, PipelineStage } from '@/types'
import PipelineCard from './PipelineCard'

interface PipelineColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onStageChange: (leadId: string, newStage: PipelineStage) => void
  isDragging: boolean
  onDragStart: (leadId: string) => void
  onDragEnd: () => void
  onDrop: (stage: PipelineStage) => void
}

export default function PipelineColumn({
  stage,
  leads,
  onStageChange,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: PipelineColumnProps) {
  const colors = STAGE_COLORS[stage]
  const label = STAGE_LABELS[stage]
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (!dragOver) setDragOver(true)
    },
    [dragOver]
  )

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      onDrop(stage)
    },
    [onDrop, stage]
  )

  return (
    <div
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl transition-all',
        isDragging && dragOver && 'ring-2 ring-brand-500 ring-offset-2 bg-brand-50/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 mb-2',
        colors.bg
      )}>
        <span className={cn('text-sm font-semibold', colors.text)}>
          {label}
        </span>
        <span className={cn(
          'badge text-[10px] min-w-[20px] justify-center',
          colors.bg,
          colors.text,
          colors.border,
          'border'
        )}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {leads.length === 0 ? (
          <div className={cn(
            'rounded-xl border border-dashed p-4 text-center transition-colors',
            isDragging && dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200',
          )}>
            <p className="text-xs text-gray-400">
              {isDragging ? 'Drop here' : 'No leads'}
            </p>
          </div>
        ) : (
          leads.map((lead) => (
            <PipelineCard
              key={lead.id}
              lead={lead}
              onStageChange={onStageChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  )
}
