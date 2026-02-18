'use client'

import { useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS } from '@/hooks/usePipeline'
import type { Lead, PipelineStage } from '@/types'

interface PipelineCardProps {
  lead: Lead
  onStageChange: (leadId: string, newStage: PipelineStage) => void
}

export default function PipelineCard({ lead, onStageChange }: PipelineCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const athleteName = lead.athlete_name || lead.contact_name || 'Unknown'

  return (
    <div className="card p-3 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{athleteName}</h4>
          {lead.athlete_level && (
            <span className="badge text-[10px] bg-white/10 text-white/60 mt-1 capitalize">
              {lead.athlete_level.replace('_', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="rounded-lg p-1 hover:bg-white/5 shrink-0"
        >
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            showPicker && 'rotate-180'
          )} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Days since update */}
      <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <Clock className="h-3 w-3" />
        {formatRelativeTime(lead.updated_at)}
      </div>

      {/* Temperature */}
      {lead.lead_temperature && (
        <div className="mt-1">
          <span className={cn(
            'badge text-[10px]',
            lead.lead_temperature === 'hot' && 'bg-red-500/15 text-red-400',
            lead.lead_temperature === 'warm' && 'bg-amber-500/15 text-amber-400',
            lead.lead_temperature === 'cold' && 'bg-blue-500/15 text-blue-400',
          )}>
            {lead.lead_temperature.toUpperCase()}
          </span>
        </div>
      )}

      {/* Stage picker dropdown */}
      {showPicker && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border shadow-lg overflow-hidden" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
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
                    ? 'bg-white/5 cursor-default'
                    : 'hover:bg-white/5'
                )}
                style={{ color: isCurrent ? 'var(--text-muted)' : 'var(--text-secondary)' }}
              >
                <span className={cn('h-2 w-2 rounded-full', colors.bg, colors.border, 'border')} />
                {STAGE_LABELS[stage]}
                {isCurrent && <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>current</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
