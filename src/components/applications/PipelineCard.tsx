'use client'

import { useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { cn, formatRelativeTime, getTemperatureDotClass } from '@/lib/utils'
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
    <div className="card p-3 relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {athleteName}
          </h4>
          {lead.athlete_level && (
            <span
              className="text-[10px] mt-1 capitalize rounded-sm px-1.5 py-0.5 inline-block font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              {lead.athlete_level.replace('_', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="btn-icon p-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200"
        >
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className={cn('transition-transform duration-200 ease-apple', showPicker && 'rotate-180')}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>
      </div>

      {/* Days since update */}
      <div className="mt-1.5 flex items-center gap-1 text-[11px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
        <Clock size={12} strokeWidth={1.75} />
        {formatRelativeTime(lead.updated_at)}
      </div>

      {/* Temperature dot */}
      {lead.lead_temperature && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={cn('status-dot', getTemperatureDotClass(lead.lead_temperature))} />
          <span
            className="text-[10px] font-medium capitalize"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {lead.lead_temperature}
          </span>
        </div>
      )}

      {/* Stage picker dropdown */}
      {showPicker && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg overflow-hidden animate-scale-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors duration-150"
                style={{
                  color: isCurrent ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  background: isCurrent ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <span className={cn('h-2 w-2 rounded-full', colors.bg, colors.border, 'border')} />
                {STAGE_LABELS[stage]}
                {isCurrent && (
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    current
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
