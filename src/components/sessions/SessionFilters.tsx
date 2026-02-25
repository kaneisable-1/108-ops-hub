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

const sentimentOptions: { value: CoachSentiment | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'green', label: 'Green', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'yellow', label: 'Yellow', color: 'bg-amber-100 text-amber-700' },
  { value: 'red', label: 'Red', color: 'bg-red-100 text-red-700' },
]

export default function SessionFiltersBar({ filters, onFiltersChange, coaches }: SessionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-3">
      {/* Sentiment chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {sentimentOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFiltersChange({ ...filters, sentiment: opt.value })}
            className={cn(
              'badge whitespace-nowrap text-xs transition-all duration-200 ease-apple cursor-pointer',
              filters.sentiment === opt.value
                ? opt.value === 'all'
                  ? 'bg-gray-900 text-white'
                  : opt.color
                : opt.color
            )}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="badge whitespace-nowrap transition-colors duration-200 ease-apple cursor-pointer"
          style={{
            background: showAdvanced
              ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)'
              : 'var(--bg-secondary)',
            color: showAdvanced ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          }}
        >
          <Filter size={12} strokeWidth={1.75} className="mr-1 inline" />
          Filters
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card p-3 space-y-3 animate-fade-in">
          {/* Coach filter */}
          {coaches.length > 0 && (
            <div>
              <label className="section-label mb-1 block">Coach</label>
              <select
                value={filters.coach_id || ''}
                onChange={(e) => onFiltersChange({ ...filters, coach_id: e.target.value || undefined })}
                className="select w-full"
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
              <label className="section-label mb-1 block">From</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value || undefined })}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="section-label mb-1 block">To</label>
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
