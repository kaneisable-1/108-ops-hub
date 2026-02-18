'use client'

import { useState } from 'react'
import { ChevronDown, Clock, GripVertical } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS } from '@/hooks/usePipeline'
import type { Lead, PipelineStage } from '@/types'

interface PipelineCardProps {
  lead: Lead
  onStageChange: (leadId: string, newStage: PipelineStage) => void
  onDragStart?: (leadId: string) => void
  onDragEnd?: () => void
}

export default function PipelineCard({ lead, onStageChange, onDragStart, onDragEnd }: PipelineCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const athleteName = lead.athlete_name || lead.contact_name || 'Unknown'

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
    setIsDragging(true)
    onDragStart?.(lead.id)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  return (
    <div
      className={cn(
        'card p-3 relative transition-opacity cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{athleteName}</h4>
            {lead.athlete_level && (
              <span className="badge text-[10px] bg-gray-100 text-gray-600 mt-1 capitalize">
                {lead.athlete_level.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowPicker(!showPicker)
          }}
          className="rounded-lg p-1 hover:bg-gray-100 shrink-0"
        >
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            showPicker && 'rotate-180'
          )} />
        </button>
      </div>

      {/* Days since update */}
      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400 pl-5">
        <Clock className="h-3 w-3" />
        {formatRelativeTime(lead.updated_at)}
      </div>

      {/* Temperature */}
      {lead.lead_temperature && (
        <div className="mt-1 pl-5">
          <span className={cn(
            'badge text-[10px]',
            lead.lead_temperature === 'hot' && 'bg-gray-900 text-white',
            lead.lead_temperature === 'warm' && 'bg-gray-200 text-gray-700',
            lead.lead_temperature === 'cold' && 'bg-gray-100 text-gray-500',
          )}>
            {lead.lead_temperature.toUpperCase()}
          </span>
        </div>
      )}

      {/* Stage picker dropdown */}
      {showPicker && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {PIPELINE_STAGES.map((stage) => {
            const colors = STAGE_COLORS[stage]
            const isCurrent = stage === lead.pipeline_stage
            return (
              <button
                key={stage}
                onClick={() => {
                  if (!isCurrent) {
                    onStageChange(lead.id, stage)
                  }
                  setShowPicker(false)
                }}
                disabled={isCurrent}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                  isCurrent
                    ? 'bg-gray-50 text-gray-400 cursor-default'
                    : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', colors.bg, colors.border, 'border')} />
                {STAGE_LABELS[stage]}
                {isCurrent && <span className="ml-auto text-[10px] text-gray-400">current</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
