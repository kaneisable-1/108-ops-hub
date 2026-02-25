'use client'

import { cn } from '@/lib/utils'
import { STAGE_LABELS, STAGE_COLORS } from '@/hooks/usePipeline'
import type { Lead, PipelineStage } from '@/types'
import PipelineCard from './PipelineCard'

interface PipelineColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onStageChange: (leadId: string, newStage: PipelineStage) => void
}

export default function PipelineColumn({ stage, leads, onStageChange }: PipelineColumnProps) {
  const colors = STAGE_COLORS[stage]
  const label = STAGE_LABELS[stage]

  return (
    <div className="flex w-64 shrink-0 flex-col">
      {/* Column header */}
      <div className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 mb-2',
        colors.bg
      )}>
        <span className={cn('text-sm font-semibold', colors.text)}>
          {label}
        </span>
        <span className={cn(
          'badge text-[10px] min-w-[20px] justify-center tabular-nums',
          colors.bg,
          colors.text,
          colors.border,
          'border'
        )}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin max-h-[calc(100vh-280px)] pr-1">
        {leads.length === 0 ? (
          <div
            className="rounded-lg p-4 text-center"
            style={{ border: '1px dashed var(--border-medium)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No leads</p>
          </div>
        ) : (
          leads.map((lead) => (
            <PipelineCard
              key={lead.id}
              lead={lead}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
