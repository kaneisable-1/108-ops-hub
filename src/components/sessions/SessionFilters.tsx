'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachSentiment, SessionFilters as Filters } from '@/types'

interface SessionFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  coaches: { id: string; name: string }[]
}

const sentimentOptions: { value: CoachSentiment | 'all'; label: string; color: string; activeColor: string }[] = [
  { value: 'all', label: 'All', color: 'text-gray-400', activeColor: 'bg-white/10 text-white' },
  { value: 'green', label: 'Green', color: 'bg-emerald-500/10 text-emerald-400', activeColor: 'bg-emerald-500/25 text-emerald-300' },
  { value: 'yellow', label: 'Yellow', color: 'bg-amber-500/10 text-amber-400', activeColor: 'bg-amber-500/25 text-amber-300' },
  { value: 'red', label: 'Red', color: 'bg-red-500/10 text-red-400', activeColor: 'bg-red-500/25 text-red-300' },
]

export default function SessionFiltersBar({ filters, onFiltersChange, coaches }: SessionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-3">
      {/* Sentiment chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sentimentOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFiltersChange({ ...filters, sentiment: opt.value })}
            className={cn(
              'badge whitespace-nowrap text-xs transition-all',
              filters.sentiment === opt.value ? opt.activeColor : opt.color
            )}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="badge whitespace-nowrap" style={{ background: 'var(--surface-secondary)', color: 'var(--text-tertiary)' }}
        >
          <Filter className="h-3 w-3 mr-1 inline" />
          Filters
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card p-3 space-y-3">
          {/* Coach filter */}
          {coaches.length > 0 && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Coach</label>
              <select
                value={filters.coach_id || ''}
                onChange={(e) => onFiltersChange({ ...filters, coach_id: e.target.value || undefined })}
                className="input w-full text-sm"
              >
                <option value="">All Coaches</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>From</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value || undefined })}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>To</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value || undefined })}
                className="input w-full text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
